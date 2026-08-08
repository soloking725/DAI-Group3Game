#!/usr/bin/env node
// =====================================================================
// check_script_order.js — static <script> load-order linter
// =====================================================================
// Companion to game/bootDependencyCheck.js (the runtime fallback). This
// catches a bad `game/*.js` load order before the game ever runs: for
// every HTML file that loads a set of game/*.js scripts, it checks that
// no file references a top-level name before the file that declares it
// has been loaded, among files that page actually loads.
//
// Same spirit/CLI convention as Plans/room_verify_cli.js.
//
//   node Plans/check_script_order.js            # pass/fail summary per HTML file
//   node Plans/check_script_order.js --full     # + every violation's detail
//
// Why AST, not string-scanning: reuses recast (already a package.json
// dependency, used by editor_shell/constPatcher.js) and its bundled
// ast-types, which provides a real scope-aware visitor
// (path.scope.lookup(name) resolves a name through the file's own actual
// JS scope chain — function params, blocks, hoisting — and returns
// undefined only for a genuine free/cross-file reference). No new
// dependency added; same parser wrapper constPatcher.js already uses
// (recast's own babel preset rejects a pipelineOperator config this
// @babel/parser version doesn't support, so a minimal wrapper sidesteps
// it exactly the same way).
//
// Deliberately excludes (does not flag) two things that look like free
// references but aren't real cross-file dependencies:
//   - Any reference that is itself the direct operand of a `typeof`
//     check (`typeof X !== 'undefined'` etc.) — 233 of these exist in
//     game/*.js today specifically because they tolerate any load order;
//     flagging them would make this tool actively wrong.
//   - A consumed name whose declaring file isn't loaded by the page at
//     all. Many editor tools intentionally load only a subset of
//     game/*.js (e.g. room_verify.html never loads boss.js) — that's
//     correct, not a bug this tool should report.
// =====================================================================

const fs = require('fs');
const path = require('path');
const recast = require('recast');
const babel = require('@babel/parser');
const astTypes = require('ast-types');

const REPO_ROOT = path.join(__dirname, '..');
const GAME_DIR = path.join(REPO_ROOT, 'game');
const EDITOR_DIR = path.join(REPO_ROOT, 'editor');
const args = process.argv.slice(2);
const FULL = args.includes('--full');

const babelParser = {
  parse(source) {
    return babel.parse(source, {
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      plugins: ['objectRestSpread'],
    });
  },
};

// Browser/JS-standard globals + the Node globals the dual-use
// (module.exports-tail) files reference under a typeof guard's sibling
// unguarded line (`module.exports = ...`) — see minibossRegistry.js/
// floorPlanWalkEngine.js. Not attempting to be a complete ECMA/DOM
// global list, just what this codebase's actual code touches.
const GLOBAL_ALLOWLIST = new Set([
  'window', 'document', 'console', 'self', 'globalThis', 'undefined', 'NaN', 'Infinity',
  'Math', 'JSON', 'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'Proxy', 'Reflect',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'ArrayBuffer', 'DataView',
  'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array',
  'Float32Array', 'Float64Array',
  'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent',
  'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'queueMicrotask', 'structuredClone',
  'Image', 'Audio', 'fetch', 'localStorage', 'sessionStorage', 'navigator', 'performance',
  'CustomEvent', 'Event', 'MutationObserver', 'ResizeObserver', 'Worker', 'Blob', 'URL',
  'FormData', 'XMLHttpRequest', 'WebSocket', 'crypto', 'matchMedia', 'getComputedStyle',
  'alert', 'confirm', 'prompt', 'history', 'location', 'screen', 'devicePixelRatio',
  'module', 'exports', 'require', 'global', 'process',
]);

function isKeyPosition(path) {
  const parent = path.parentPath && path.parentPath.node;
  if (!parent) return false;
  if (path.name === 'property' && (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && !parent.computed) return true;
  if (path.name === 'key' && !parent.computed &&
      ['Property', 'ObjectProperty', 'ObjectMethod', 'ClassMethod', 'ClassProperty', 'MethodDefinition', 'PropertyDefinition'].includes(parent.type)) return true;
  if (path.name === 'label' && ['LabeledStatement', 'BreakStatement', 'ContinueStatement'].includes(parent.type)) return true;
  if (parent.type === 'MetaProperty') return true;
  return false;
}

function isTypeofOperand(path) {
  const parent = path.parentPath && path.parentPath.node;
  return !!parent && parent.type === 'UnaryExpression' && parent.operator === 'typeof' && path.name === 'argument';
}

// The only references that are actually load-order-sensitive are ones
// that execute the moment the <script> tag runs — top-level statements,
// and IIFEs (a real, documented convention in this codebase — see
// CLAUDE.md's "Module convention" section). A reference inside an
// ordinary function/method body is NOT order-sensitive: that function
// only runs later (during gameplay), by which point every <script> tag
// has already finished loading, regardless of what order they were in.
// Walks from an identifier up to Program; any function boundary that
// ISN'T itself directly invoked where it's written (an IIFE) means
// everything inside it is deferred, not immediate.
function isImmediatelyExecuting(identPath) {
  let p = identPath.parentPath;
  while (p) {
    const node = p.node;
    if (node.type === 'Program') return true;
    if (node.type === 'FunctionDeclaration') return false;
    if (node.type === 'ClassMethod' || node.type === 'ClassPrivateMethod' || node.type === 'ObjectMethod') return false;
    if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const gp = p.parentPath && p.parentPath.node;
      const isIIFE = gp && (gp.type === 'CallExpression' || gp.type === 'OptionalCallExpression') && gp.callee === node;
      if (!isIIFE) return false;
      // else: it's an IIFE — its body runs immediately too, keep walking up
    }
    p = p.parentPath;
  }
  return true;
}

function analyzeFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = recast.parse(source, { parser: babelParser });

  const provides = new Set();
  for (const stmt of ast.program.body) {
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) collectPatternNames(decl.id, provides);
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      provides.add(stmt.id.name);
    } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
      provides.add(stmt.id.name);
    }
  }

  const consumes = new Set();
  astTypes.visit(ast, {
    visitIdentifier(p) {
      const name = p.node.name;
      if (!isKeyPosition(p) && !isTypeofOperand(p) && isImmediatelyExecuting(p)) {
        const found = p.scope.lookup(name);
        if (!found && !GLOBAL_ALLOWLIST.has(name)) consumes.add(name);
      }
      this.traverse(p);
    },
  });

  return { provides, consumes };
}

function collectPatternNames(node, into) {
  if (!node) return;
  if (node.type === 'Identifier') into.add(node.name);
  else if (node.type === 'ObjectPattern') {
    for (const prop of node.properties) collectPatternNames(prop.value || prop.argument, into);
  } else if (node.type === 'ArrayPattern') {
    for (const el of node.elements) collectPatternNames(el, into);
  } else if (node.type === 'AssignmentPattern') {
    collectPatternNames(node.left, into);
  } else if (node.type === 'RestElement') {
    collectPatternNames(node.argument, into);
  }
}

// ── Build the full game/*.js analysis map once ──────────────────────────
const gameFiles = fs.readdirSync(GAME_DIR).filter((f) => f.endsWith('.js'));
const analysis = {}; // basename -> {provides, consumes}
for (const f of gameFiles) {
  analysis[f] = analyzeFile(path.join(GAME_DIR, f));
}

// basename -> the (first) file that provides it, for violation reporting
const providerOf = {};
for (const f of gameFiles) {
  for (const name of analysis[f].provides) {
    if (!(name in providerOf)) providerOf[name] = f;
  }
}

// ── Extract <script src="...game/X.js"> order from an HTML file ────────
function extractScriptOrder(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const re = /<script\s+src="([^"]*game\/([A-Za-z0-9_]+\.js))"/g;
  const order = [];
  let m;
  while ((m = re.exec(html))) order.push(m[2]);
  return order;
}

function checkOrder(order) {
  const orderSet = new Set(order);
  const declaredSoFar = new Set();
  const violations = [];

  for (const file of order) {
    const fa = analysis[file];
    if (!fa) continue; // referenced game/*.js file that doesn't exist locally — not this tool's concern
    for (const name of fa.consumes) {
      if (declaredSoFar.has(name)) continue;
      const provider = providerOf[name];
      if (!provider) continue; // not provided by any game/*.js file — likely a real bug elsewhere, but out of scope here
      if (!orderSet.has(provider)) continue; // provider isn't loaded by this page at all — intentional subset, not a violation
      if (provider === file) continue; // same-file forward reference already resolved by scope.lookup; shouldn't reach here, but guard anyway
      violations.push({ consumer: file, name, provider });
    }
    for (const name of fa.provides) declaredSoFar.add(name);
  }
  return violations;
}

// ── Which HTML files to audit ────────────────────────────────────────
const targets = [path.join(REPO_ROOT, 'index.html')];
for (const f of fs.readdirSync(EDITOR_DIR)) {
  if (!f.endsWith('.html')) continue;
  const full = path.join(EDITOR_DIR, f);
  const order = extractScriptOrder(full);
  // Only audit files that hand-list their own game/*.js subset (>=1 tag).
  // debug_v1.html/debug_v2.html clone index.html's own tags via fetch+regex
  // at runtime rather than hand-listing them, so auditing index.html
  // already covers them — including them here would just re-check the
  // same list under a different name.
  if (order.length > 0) targets.push(full);
}

let anyFail = false;
const summary = [];
for (const target of targets) {
  const rel = path.relative(REPO_ROOT, target);
  const order = extractScriptOrder(target);
  const violations = checkOrder(order);
  if (violations.length > 0) anyFail = true;
  summary.push({ rel, count: violations.length, violations });
}

console.log(`\nSTILLPOINT — script load-order check (${summary.length} HTML files audited)\n`);
for (const s of summary) {
  const tag = s.count === 0 ? 'OK  ' : `FAIL(${s.count})`;
  console.log(`  ${tag}  ${s.rel}`);
  if (FULL) {
    for (const v of s.violations) {
      console.log(`         ${v.consumer} references '${v.name}' before ${v.provider} (which declares it) is loaded`);
    }
  }
}
console.log('');
if (!FULL && anyFail) console.log('Run with --full for violation detail.\n');

process.exit(anyFail ? 1 : 0);
