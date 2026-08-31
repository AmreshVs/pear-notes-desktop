import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Eye, EyeOff, Lock, X } from 'lucide-react'

import { PASSWORD_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { isValidBackupPassword } from '@pear-notes/core/utils.js'

import { getPasswordRules, getPasswordStrengthUi } from '../../utils/passwordStrength'

const STRENGTH_BAR_COLORS = [
  'bg-accent-danger',
  'bg-accent-danger',
  'bg-yellow-500',
  'bg-yellow-500',
  'bg-accent-primary',
  'bg-accent-success'
]

export default function BackupPasswordModal({ open, mode, error, onSubmit, onCancel }) {
  const { t } = useTranslation()
  const isCreate = mode === 'create'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)

  const strength = useMemo(() => getPasswordStrengthUi(password, t), [password, t])
  const passwordsMatch = password === confirm
  const canSubmit = isCreate
    ? isValidBackupPassword(password) && passwordsMatch
    : password.trim().length > 0

  const reset = () => {
    setPassword('')
    setConfirm('')
    setVisible(false)
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(password)
    reset()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && canSubmit) handleSubmit()
  }

  if (!open) return null

  return (
    <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in fade-in duration-300'
        onClick={handleCancel}
      />

      <div className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-8 max-w-md w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full' />
        <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full' />

        <div className='relative z-10 flex flex-col space-y-6 min-h-0 overflow-y-auto'>
          <div className='flex flex-col items-center text-center space-y-2'>
            <div className='w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center ring-1 ring-accent-primary/20 mb-2'>
              <Lock className='w-6 h-6 text-accent-primary' />
            </div>
            <h3 className='text-lg font-bold text-text-primary'>
              {isCreate ? t('backup.password.createTitle') : t('backup.password.enterTitle')}
            </h3>
            <p className='text-text-tertiary text-xs leading-relaxed max-w-[300px]'>
              {isCreate ? t('backup.password.createDesc') : t('backup.password.enterDesc')}
            </p>
          </div>

          <div className='space-y-3'>
            <div className='relative'>
              <input
                type={visible ? 'text' : 'password'}
                maxLength={PASSWORD_MAX_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isCreate
                    ? t('backup.password.createPlaceholder')
                    : t('backup.password.placeholder')
                }
                autoFocus
                className='w-full px-4 py-3 pr-11 bg-overlay-faint border border-overlay-medium focus:border-accent-primary/30 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary/40 outline-none transition-colors'
              />
              <button
                onClick={() => setVisible((v) => !v)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors'
              >
                {visible ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
            </div>

            {isCreate && (
              <>
                <input
                  type={visible ? 'text' : 'password'}
                  maxLength={PASSWORD_MAX_LENGTH}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('backup.password.confirmPlaceholder')}
                  className='w-full px-4 py-3 bg-overlay-faint border border-overlay-medium focus:border-accent-primary/30 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary/40 outline-none transition-colors'
                />

                <div className='space-y-2 pt-1'>
                  <div className='flex items-center gap-2'>
                    <div className='flex-1 h-1.5 bg-overlay-medium rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${STRENGTH_BAR_COLORS[strength.score]}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className='text-xs font-bold text-text-tertiary w-16 text-right'>
                      {strength.label}
                    </span>
                  </div>
                  <ul className='grid grid-cols-2 gap-x-3 gap-y-1'>
                    {getPasswordRules(t).map((rule) => {
                      const met = strength.checks[rule.key]
                      return (
                        <li
                          key={rule.key}
                          className={`flex items-center gap-1.5 text-xs ${met ? 'text-accent-success' : 'text-text-tertiary/70'}`}
                        >
                          {met ? (
                            <Check className='w-3 h-3 shrink-0' />
                          ) : (
                            <X className='w-3 h-3 shrink-0' />
                          )}
                          {rule.label}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {confirm.length > 0 && !passwordsMatch && (
                  <p className='text-xs text-accent-danger/80 ml-1'>
                    {t('backup.password.mismatch')}
                  </p>
                )}
              </>
            )}

            {error && <p className='text-xs text-accent-danger/80 ml-1'>{error}</p>}
          </div>

          <div className='flex gap-3 w-full'>
            <button
              onClick={handleCancel}
              className='flex-1 py-3 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className='flex-1 py-3 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed'
            >
              {isCreate ? t('backup.password.createButton') : t('backup.password.restoreButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
