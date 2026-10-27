const CANCELLED = Object.freeze({ cancelled: true, rootKey: '' })

function createLockRoot({ deviceAuth, secretStore, getWindowHandle, platform = process.platform }) {
  function isSupported() {
    if (platform === 'linux' || !deviceAuth) return false
    return deviceAuth.isSupported() && secretStore.isAvailable()
  }

  function secretName(vaultId) {
    const id = typeof vaultId === 'string' ? vaultId.replace(/[^A-Za-z0-9._-]/g, '') : ''
    return id ? `${secretStore.LOCK_ROOT_SECRET_PREFIX}${id}` : null
  }

  async function authenticate(reason) {
    if (!deviceAuth) return false
    try {
      return await deviceAuth.authenticate(reason, getWindowHandle())
    } catch (e) {
      console.error('device-auth:authenticate failed', e)
      return false
    }
  }

  async function read(vaultId, reason) {
    const name = secretName(vaultId)
    if (!name || !isSupported()) return { ...CANCELLED }
    try {
      if (!(await deviceAuth.authenticate(reason, getWindowHandle()))) return { ...CANCELLED }
    } catch (e) {
      console.error('lock-root:read authenticate failed', e)
      return { ...CANCELLED }
    }
    return { cancelled: false, rootKey: secretStore.getSecret(name) || '' }
  }

  function store(vaultId, rootKey) {
    const name = secretName(vaultId)
    if (!name || !isSupported() || typeof rootKey !== 'string') return false
    return secretStore.setSecret(name, rootKey)
  }

  function remove(vaultId) {
    const name = secretName(vaultId)
    return name ? secretStore.deleteSecret(name) : false
  }

  return { isSupported, secretName, authenticate, read, store, remove }
}

module.exports = { createLockRoot }
