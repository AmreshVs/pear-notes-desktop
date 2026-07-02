export const RECOVERY_KEY_LENGTH = 64

const RECOVERY_KEY_PATTERN = /^[0-9a-fA-F]+$/

export function normalizeRecoveryKey (key) {
  return (key || '').replace(/\s+/g, '').toLowerCase()
}

export function isValidRecoveryKey (key) {
  const normalized = normalizeRecoveryKey(key)
  return normalized.length === RECOVERY_KEY_LENGTH && RECOVERY_KEY_PATTERN.test(normalized)
}
