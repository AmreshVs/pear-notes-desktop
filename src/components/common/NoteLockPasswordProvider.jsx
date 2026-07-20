import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { backendApi } from '@pear-notes/core/backend/api.js'

import { NoteLockPasswordContext } from '../../lib/noteLockPasswordContext'
import LockUnavailableModal from '../modals/LockUnavailableModal'
import NoteLockPasswordModal from '../modals/NoteLockPasswordModal'

export default function NoteLockPasswordProvider({ children }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [unavailableOpen, setUnavailableOpen] = useState(false)
  const resolverRef = useRef(null)

  const requestUnlockPassword = useCallback(() => {
    setError('')
    setOpen(true)
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((value) => {
    setOpen(false)
    setError('')
    const resolve = resolverRef.current
    resolverRef.current = null
    if (resolve) resolve(value)
  }, [])

  const handleSubmit = useCallback(
    async (password) => {
      const { valid, retryAfter } = await backendApi.verifyNoteLockPassword({ password })
      if (valid) {
        settle(true)
      } else if (retryAfter > 0) {
        setError(t('noteLockPassword.tooManyAttempts', { seconds: retryAfter }))
      } else {
        setError(t('noteLockPassword.incorrectPassword'))
      }
    },
    [settle, t]
  )

  const handleCancel = useCallback(() => settle(false), [settle])

  const showLockUnavailable = useCallback(() => setUnavailableOpen(true), [])

  return (
    <NoteLockPasswordContext.Provider value={{ requestUnlockPassword, showLockUnavailable }}>
      {children}
      <NoteLockPasswordModal
        open={open}
        mode='enter'
        error={error}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
      <LockUnavailableModal open={unavailableOpen} onCancel={() => setUnavailableOpen(false)} />
    </NoteLockPasswordContext.Provider>
  )
}
