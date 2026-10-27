import Module, { createRequire } from 'node:module'

const require = createRequire(new URL('../anchor.js', import.meta.url))
const originalLoad = Module._load

export const moduleMocks = {}

Module._load = function load(request, parent, isMain) {
  if (Object.hasOwn(moduleMocks, request)) {
    const mock = moduleMocks[request]
    if (mock instanceof Error) throw mock
    return mock
  }
  return originalLoad.call(this, request, parent, isMain)
}

export function loadFresh(relativePath) {
  const resolved = require.resolve(relativePath)
  delete require.cache[resolved]
  return require(resolved)
}
