/* global require, module */
const bindings = require('bindings')

let native = null
let loadError = null

try {
  native = bindings('pear_device_auth')
} catch (error) {
  loadError = error
}

function isSupported() {
  if (!native) return false
  try {
    return native.isSupported()
  } catch {
    return false
  }
}

function authenticate(reason, windowHandle) {
  if (!native) {
    return Promise.reject(loadError || new Error('pear-device-auth native module unavailable'))
  }
  return native.authenticate(String(reason || 'Authenticate'), windowHandle || null)
}

module.exports = { isSupported, authenticate, loadError: () => loadError }
