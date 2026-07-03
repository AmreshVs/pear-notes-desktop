import { getBackupPasswordStrength } from '@pear-notes/core/utils.js'

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Fair', 'Good', 'Strong']

export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 10 characters' },
  { key: 'uppercase', label: 'An uppercase letter' },
  { key: 'lowercase', label: 'A lowercase letter' },
  { key: 'number', label: 'A number' },
  { key: 'symbol', label: 'A symbol' }
]

export function getPasswordStrengthUi (password) {
  const { checks, score, valid } = getBackupPasswordStrength(password)
  return {
    checks,
    score,
    valid,
    label: STRENGTH_LABELS[score] || STRENGTH_LABELS[0]
  }
}
