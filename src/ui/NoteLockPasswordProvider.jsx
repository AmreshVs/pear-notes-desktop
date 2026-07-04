import { useCallback, useRef, useState } from 'react'
import { backendApi } from '@pear-notes/core/backend/api.js'
import NoteLockPasswordModal from './NoteLockPasswordModal'
import LockUnavailableModal from './LockUnavailableModal'
import { NoteLockPasswordContext } from '../lib/noteLockPasswordContext'

export default function NoteLockPasswordProvider({ children }) {
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

  const handleSubmit = useCallback(async (password) => {
    const valid = await backendApi.verifyNoteLockPassword({ password })
    if (valid) {
      settle(true)
    } else {
      setError('Incorrect password')
    }
  }, [settle])

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
      <LockUnavailableModal
        open={unavailableOpen}
        onCancel={() => setUnavailableOpen(false)}
      />
    </NoteLockPasswordContext.Provider>
  )
}
