import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { loadSettings } from '@pear-notes/core/store/slices/settingsSlice.js'

import {
  hideLockUnavailable,
  resolveNoteLockPassword,
  useNoteLockPasswordRequest
} from '../../lib/noteLockPasswordFlow'
import { hasLockPassword, submitLockPassword } from '../../lib/noteLockSession'
import LockUnavailableModal from '../modals/LockUnavailableModal'
import NoteLockPasswordModal from '../modals/NoteLockPasswordModal'
import NoteLockPromptModal from '../modals/NoteLockPromptModal'

export default function NoteLockPasswordProvider({ children }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const request = useNoteLockPasswordRequest()
  const [error, setError] = useState('')
  const isCreate = request.mode === 'create'

  const settle = useCallback((value) => {
    setError('')
    resolveNoteLockPassword(value)
  }, [])

  const handleEnter = useCallback(
    async (password) => {
      const { ok, retryAfter } = await submitLockPassword(password)
      if (ok) {
        settle(true)
      } else if (retryAfter > 0) {
        setError(t('noteLockPassword.tooManyAttempts', { seconds: retryAfter }))
      } else {
        setError(t('noteLockPassword.incorrectPassword'))
      }
    },
    [settle, t]
  )

  const handleCreate = useCallback(
    async (password) => {
      const firstTime = !hasLockPassword()
      const done = await backendApi.setNoteLockPassword({ password })
      if (!done) {
        setError(t('noteLockPassword.setFailed'))
        return
      }
      dispatch(loadSettings())
      if (firstTime) await submitLockPassword(password)
      settle(true)
    },
    [dispatch, settle, t]
  )

  const handleCancel = useCallback(() => settle(false), [settle])

  return (
    <>
      {children}
      <NoteLockPasswordModal
        key={request.mode || 'closed'}
        open={request.mode !== null}
        mode={isCreate ? 'create' : 'enter'}
        purpose={request.purpose}
        message={request.message}
        requireUnderstood={isCreate && !hasLockPassword()}
        error={error}
        onSubmit={isCreate ? handleCreate : handleEnter}
        onCancel={handleCancel}
      />
      <NoteLockPromptModal />
      <LockUnavailableModal open={request.unavailable} onCancel={hideLockUnavailable} />
    </>
  )
}
