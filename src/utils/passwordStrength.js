import i18next from 'i18next'

import { getBackupPasswordStrength } from '@pear-notes/core/utils.js'

export const getPasswordRules = (t = i18next.t) => [
  { key: 'length', label: t('noteLockPassword.rules.length', 'At least 10 characters') },
  { key: 'uppercase', label: t('noteLockPassword.rules.uppercase', 'An uppercase letter') },
  { key: 'lowercase', label: t('noteLockPassword.rules.lowercase', 'A lowercase letter') },
  { key: 'number', label: t('noteLockPassword.rules.number', 'A number') },
  { key: 'symbol', label: t('noteLockPassword.rules.symbol', 'A symbol') }
]

export function getPasswordStrengthUi(password, t = i18next.t) {
  const { checks, score, valid } = getBackupPasswordStrength(password)
  const strengthLabels = [
    t('noteLockPassword.strength.veryWeak', 'Very weak'),
    t('noteLockPassword.strength.weak', 'Weak'),
    t('noteLockPassword.strength.fair', 'Fair'),
    t('noteLockPassword.strength.fair', 'Fair'),
    t('noteLockPassword.strength.good', 'Good'),
    t('noteLockPassword.strength.strong', 'Strong')
  ]
  return {
    checks,
    score,
    valid,
    label: strengthLabels[score] || strengthLabels[0]
  }
}
