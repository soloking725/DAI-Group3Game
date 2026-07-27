// beforeunload protection (2026-07-23), shared across editors. Rather than
// hooking every single mutation call site (levelEditor alone has 20+), this
// snapshots the working data as JSON at "known good" points (page load, and
// after a real save) and does one cheap JSON.stringify comparison at unload
// time. Same accuracy, far fewer call sites to keep in sync.
(function () {
  window.UnsavedGuard = {
    // getWorkingData: () => the current in-memory object/array to watch.
    // Call `checkpoint()` right after boot and after any real save.
    watch(getWorkingData) {
      let baseline = JSON.stringify(getWorkingData());
      window.addEventListener('beforeunload', (e) => {
        if (JSON.stringify(getWorkingData()) === baseline) return;
        e.preventDefault();
        e.returnValue = '';
      });
      return {
        checkpoint() { baseline = JSON.stringify(getWorkingData()); },
      };
    },
  };
})();
