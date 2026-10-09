export function getDbEncryptionKey() {
  try {
    return window.electronBridge.getVaultKey() || null
  } catch (e) {
    console.error('Error in getDbEncryptionKey', e)
    return null
  }
}

export function setDbEncryptionKey(key) {
  try {
    return window.electronBridge.setVaultKey(key) === true
  } catch (e) {
    console.error('Error in setDbEncryptionKey', e)
    return false
  }
}

export function getVaultEntropy() {
  try {
    return window.electronBridge.getVaultEntropy() || null
  } catch (e) {
    console.error('Error in getVaultEntropy', e)
    return null
  }
}

export function deleteDbEncryptionKey() {
  try {
    window.electronBridge.deleteVaultKeys()
  } catch (e) {
    console.error('Error clearing the stored secrets', e)
  }
}
