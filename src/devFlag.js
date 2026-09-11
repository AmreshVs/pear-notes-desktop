// Sets the flag that @pear-notes/core's log.js gates info/debug output on.
//
// This lives in its own module because ESM imports are hoisted: an assignment
// in index.jsx's body would run *after* every import in that file had been
// evaluated. Importing this first makes the flag the first thing that happens.
globalThis.__PEAR_DEV__ = import.meta.env.DEV === true
