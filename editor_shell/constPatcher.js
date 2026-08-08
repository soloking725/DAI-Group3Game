const fs = require('fs');
const recast = require('recast');
const babel = require('@babel/parser');

// recast's bundled "babel" parser preset enables a `pipelineOperator`
// plugin config that this @babel/parser version rejects outright
// ("requires a proposal option") — sidestep it with our own minimal
// parser wrapper using only the plugins these plain-JS editor files
// actually need.
const babelParser = {
  parse(source) {
    return babel.parse(source, {
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      plugins: ['objectRestSpread'],
    });
  },
};

// Replaces the initializer of `const NAME = ...` / `let NAME = ...` /
// `window.NAME = ...` in a source file with a new value, using an AST
// (not string patching), so every comment and formatting choice elsewhere
// in the file survives untouched. `newValueSource` is a JS expression
// source string — editors already produce this shape today via their
// "Export JSON"/"Generate JS" buttons, so no new authoring format is
// introduced.
// Finds the declarator `const/let/var NAME = ...` at the top level of the
// program (not `window.NAME = NAME`-style re-export assignments, which
// point at the same binding and would otherwise be ambiguous about which
// one is "the" definition). Falls back to a top-level `window.NAME = ...`
// assignment only if no such declarator exists.
function findTargetNode(ast, constName) {
  let declaratorNode = null;
  let assignmentNode = null;

  for (const stmt of ast.program.body) {
    if (
      stmt.type === 'VariableDeclaration' &&
      !declaratorNode
    ) {
      const decl = stmt.declarations.find((d) => d.id.type === 'Identifier' && d.id.name === constName);
      if (decl) declaratorNode = decl;
    }
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'AssignmentExpression' &&
      !assignmentNode
    ) {
      const left = stmt.expression.left;
      const isWindowDotName =
        left.type === 'MemberExpression' &&
        left.object.type === 'Identifier' &&
        left.object.name === 'window' &&
        left.property.type === 'Identifier' &&
        left.property.name === constName;
      if (isWindowDotName) assignmentNode = stmt.expression;
    }
  }

  return declaratorNode || assignmentNode;
}

function patchConstInFile(filePath, constName, newValueSource) {
  const original = fs.readFileSync(filePath, 'utf8');
  const ast = recast.parse(original, { parser: babelParser });

  const newValueNode = parseValueExpression(newValueSource);

  const target = findTargetNode(ast, constName);
  if (!target) {
    throw new Error(`No top-level "const/let/var ${constName} = ..." or "window.${constName} = ..." found in ${filePath}`);
  }

  if (target.type === 'VariableDeclarator') {
    target.init = newValueNode;
  } else {
    target.right = newValueNode;
  }

  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf8');
  return output;
}

// Reads back the current source text of `const NAME = ...`'s initializer,
// via the same AST path patchConstInFile writes through — used by callers
// that need to load the current value (e.g. into an editor's in-memory
// state) without relying on fragile string slicing.
function readConstSourceFromFile(filePath, constName) {
  const original = fs.readFileSync(filePath, 'utf8');
  const ast = recast.parse(original, { parser: babelParser });

  const target = findTargetNode(ast, constName);
  if (!target) {
    throw new Error(`No top-level "const/let/var ${constName} = ..." or "window.${constName} = ..." found in ${filePath}`);
  }

  return recast.print(target.type === 'VariableDeclarator' ? target.init : target.right).code;
}

// Parses a JS expression source string into an AST node, wrapping it in
// parens first so bare object literals (`{a:1}`) don't get misread as a
// block statement. Babel records that wrapping as `extra.parenthesized`
// on the resulting node, which recast would otherwise print back out as
// a literal `(...)` around the value — strip it so the printed output
// matches what was actually passed in.
function parseValueExpression(source) {
  const ast = recast.parse(`(${source});`, { parser: babelParser });
  const node = ast.program.body[0].expression;
  if (node.extra) {
    delete node.extra.parenthesized;
    delete node.extra.parenStart;
  }
  return node;
}

// Parses a path string like `spawn_area_1.platforms[2].h` into
// ['spawn_area_1', 'platforms', 2, 'h'].
function parsePath(pathStr) {
  const parts = [];
  for (const piece of pathStr.split('.')) {
    const m = piece.match(/^([^\[]+)((?:\[\d+\])*)$/);
    if (!m) throw new Error(`Bad path segment: ${piece}`);
    parts.push(m[1]);
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) parts.push(Number(idx[1]));
  }
  return parts;
}

// Walks an ObjectExpression/ArrayExpression AST node along `path`,
// returning the specific property/element node at the end. This is what
// lets a patch touch, say, one room's `name` field inside `AREAS` without
// regenerating (and reformatting-away the hand-written comments in) any
// of the other 72 rooms — only the one node actually being changed is
// replaced; everything else in the file is untouched, comments included.
function walkToNode(objectNode, path) {
  let node = objectNode;
  for (const key of path) {
    if (typeof key === 'number') {
      if (node.type !== 'ArrayExpression') throw new Error(`Expected an array at index ${key}, got ${node.type}`);
      node = node.elements[key];
    } else {
      if (node.type !== 'ObjectExpression') throw new Error(`Expected an object for key "${key}", got ${node.type}`);
      const prop = node.properties.find((p) => {
        const k = p.key;
        return (k.type === 'Identifier' && k.name === key) || (k.type === 'StringLiteral' && k.value === key) || (k.type === 'Literal' && k.value === key);
      });
      if (!prop) throw new Error(`No property "${key}" found`);
      node = prop.value;
    }
    if (!node) throw new Error(`Path segment "${key}" resolved to nothing`);
  }
  return node;
}

// Builds a well-formed `key: value` object property node by parsing it
// fresh (rather than hand-constructing an AST node), so it's guaranteed to
// be shaped exactly like every other Babel-parsed property in the file —
// no risk of a manually-built node using the wrong node shape/fields.
// Uses a bare identifier key when possible (matches this codebase's
// unquoted-key style everywhere else) and only falls back to a quoted key
// when the name isn't a valid identifier.
function buildObjectProperty(key, valueSource) {
  const keySrc = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
  const wrapped = parseValueExpression(`{ ${keySrc}: ${valueSource} }`);
  return wrapped.properties[0];
}

function findProperty(objectNode, key) {
  return objectNode.properties.find((p) => {
    const k = p.key;
    return (k.type === 'Identifier' && k.name === key) || (k.type === 'StringLiteral' && k.value === key) || (k.type === 'Literal' && k.value === key);
  });
}

// Like patchConstInFile, but replaces only the value at a nested path
// inside the const's object/array (e.g. `spawn_area_1.name` inside
// `AREAS`) instead of the whole top-level value — so hand-written
// comments anywhere else in the file, INCLUDING elsewhere inside the same
// top-level object, survive untouched. Use this whenever the caller knows
// which specific sub-value changed (an editor saving one room, one combo,
// one HUD element, etc.) rather than patchConstInFile's whole-object
// replacement, which is only safe for consts with no internal comments.
//
// By default, a path segment that doesn't already exist is an error (a
// typo shouldn't silently create a new key). Pass `{ allowCreate: true }`
// for call sites that intentionally add new entries (e.g. a level editor
// adding a brand-new room to AREAS) — the new property is appended at the
// end of the object, same place a human hand-adding a room would put it.
function patchPathInFile(filePath, constName, pathStr, newValueSource, opts = {}) {
  const original = fs.readFileSync(filePath, 'utf8');
  const ast = recast.parse(original, { parser: babelParser });

  const target = findTargetNode(ast, constName);
  if (!target) {
    throw new Error(`No top-level "const/let/var ${constName} = ..." or "window.${constName} = ..." found in ${filePath}`);
  }
  const rootValueNode = target.type === 'VariableDeclarator' ? target.init : target.right;

  const path = parsePath(pathStr);
  const parentPath = path.slice(0, -1);
  const lastKey = path[path.length - 1];
  const parentNode = parentPath.length ? walkToNode(rootValueNode, parentPath) : rootValueNode;

  if (typeof lastKey === 'number') {
    if (parentNode.type !== 'ArrayExpression') throw new Error(`Expected an array at index ${lastKey}, got ${parentNode.type}`);
    parentNode.elements[lastKey] = parseValueExpression(newValueSource);
  } else {
    if (parentNode.type !== 'ObjectExpression') throw new Error(`Expected an object for key "${lastKey}", got ${parentNode.type}`);
    const prop = findProperty(parentNode, lastKey);
    if (prop) {
      prop.value = parseValueExpression(newValueSource);
    } else if (opts.allowCreate) {
      parentNode.properties.push(buildObjectProperty(lastKey, newValueSource));
    } else {
      throw new Error(`No property "${lastKey}" found to replace (pass allowCreate to add a new one)`);
    }
  }

  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf8');
  return output;
}

// Syncs every top-level key of a flat const object (e.g. HUD_LAYOUT) to
// match `newObj` exactly: existing keys get their value replaced in place
// (comments/formatting on every other key untouched), keys present in
// newObj but missing from the file are appended, and keys present in the
// file but absent from newObj are removed. `valueSources` maps each key
// to its already-serialized JS source text (the caller controls
// formatting/quote style, same as before). This is the AST equivalent of
// save-server.js's old line-by-line patchLayoutBlock, but works for any
// value shape (nested objects/arrays), not just single-line blocks.
function syncTopLevelObjectKeys(filePath, constName, valueSources) {
  const original = fs.readFileSync(filePath, 'utf8');
  const ast = recast.parse(original, { parser: babelParser });

  const target = findTargetNode(ast, constName);
  if (!target) {
    throw new Error(`No top-level "const/let/var ${constName} = ..." or "window.${constName} = ..." found in ${filePath}`);
  }
  const rootNode = target.type === 'VariableDeclarator' ? target.init : target.right;
  if (rootNode.type !== 'ObjectExpression') {
    throw new Error(`${constName} is not an object literal — syncTopLevelObjectKeys only applies to flat const objects`);
  }

  const newKeys = new Set(Object.keys(valueSources));

  rootNode.properties = rootNode.properties.filter((p) => {
    const k = p.key;
    const name = k.type === 'Identifier' ? k.name : k.value;
    return newKeys.has(name);
  });

  const seen = new Set(rootNode.properties.map((p) => (p.key.type === 'Identifier' ? p.key.name : p.key.value)));

  for (const [key, valueSource] of Object.entries(valueSources)) {
    if (seen.has(key)) {
      const prop = findProperty(rootNode, key);
      prop.value = parseValueExpression(valueSource);
    } else {
      rootNode.properties.push(buildObjectProperty(key, valueSource));
    }
  }

  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf8');
  return output;
}

function literalValue(node) {
  if (!node) return undefined;
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') return node.value;
  if (node.type === 'Literal') return node.value;
  return undefined;
}

// For array-shaped consts (e.g. `let COMBO_DEFS = [ { id: '...', ... }, ... ]`)
// where elements are identified by a stable key field rather than by
// position — array index isn't a safe address to patch by, since it
// shifts whenever an earlier element is added/removed/reordered. Finds
// the element whose `idField` matches `idValue` and replaces just that
// element (everything else in the array, and every comment elsewhere in
// the file, untouched); with `allowCreate`, appends a new element at the
// end if no match is found instead of throwing.
function patchArrayElementByKey(filePath, constName, idField, idValue, newValueSource, opts = {}) {
  const original = fs.readFileSync(filePath, 'utf8');
  const ast = recast.parse(original, { parser: babelParser });

  const target = findTargetNode(ast, constName);
  if (!target) {
    throw new Error(`No top-level "const/let/var ${constName} = ..." or "window.${constName} = ..." found in ${filePath}`);
  }
  const rootNode = target.type === 'VariableDeclarator' ? target.init : target.right;
  if (rootNode.type !== 'ArrayExpression') {
    throw new Error(`${constName} is not an array literal — patchArrayElementByKey only applies to array consts`);
  }

  const index = rootNode.elements.findIndex((el) => {
    if (!el || el.type !== 'ObjectExpression') return false;
    const prop = findProperty(el, idField);
    return prop && literalValue(prop.value) === idValue;
  });

  const newValueNode = parseValueExpression(newValueSource);

  if (index !== -1) {
    rootNode.elements[index] = newValueNode;
  } else if (opts.allowCreate) {
    rootNode.elements.push(newValueNode);
  } else {
    throw new Error(`No element with ${idField} === ${JSON.stringify(idValue)} found (pass allowCreate to add a new one)`);
  }

  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf8');
  return output;
}

// Appends a brand-new top-level `const NAME = VALUE;` declaration at the end
// of the file — for editors that compose new content (a new enemy def, etc.)
// rather than edit an existing one. Refuses if NAME is already declared
// anywhere in the file (existing hand-tuned defs often reference other named
// consts, e.g. `speed: LANCER_SPEED` — overwriting one wholesale would
// silently replace that reference with a literal number and break
// enemy_editor.html's shared-variable stat editing for it; appending a new
// name sidesteps that risk entirely instead of trying to detect it).
function appendConstToFile(filePath, constName, newValueSource) {
  const original = fs.readFileSync(filePath, 'utf8');
  const ast = recast.parse(original, { parser: babelParser });

  if (findTargetNode(ast, constName)) {
    throw new Error(`"${constName}" already exists in ${filePath} — pick a different id, or edit the existing one by hand.`);
  }

  const declSource = `const ${constName} = ${newValueSource};\n`;
  const newStatement = recast.parse(declSource, { parser: babelParser }).program.body[0];

  ast.program.body.push(newStatement);

  const output = recast.print(ast).code;
  fs.writeFileSync(filePath, output, 'utf8');
  return output;
}

module.exports = { patchConstInFile, readConstSourceFromFile, patchPathInFile, syncTopLevelObjectKeys, patchArrayElementByKey, appendConstToFile };
