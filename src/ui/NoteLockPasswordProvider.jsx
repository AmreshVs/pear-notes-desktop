import { useCallback, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { loadSettings } from '@pear-notes/core/store/slices/settingsSlice.js'
import NoteLockPasswordModal from './NoteLockPasswordModal'
import LockUnavailableModal from './LockUnavailableModal'
import { NoteLockPasswordContext } from '../lib/noteLockPasswordContext'

export default function NoteLockPasswordProvider({ children }) {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
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

  const handleCreateSubmit = useCallback(async (password) => {
    const done = await backendApi.setNoteLockPassword({ password })
    if (done) dispatch(loadSettings())
    setCreateOpen(false)
  }, [dispatch])

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
      <NoteLockPasswordModal
        open={createOpen}
        mode='create'
        onSubmit={handleCreateSubmit}
        onCancel={() => setCreateOpen(false)}
      />
      <LockUnavailableModal
        open={unavailableOpen}
        onSetPassword={() => {
          setUnavailableOpen(false)
          setCreateOpen(true)
        }}
        onCancel={() => setUnavailableOpen(false)}
      />
    </NoteLockPasswordContext.Provider>
  )
}
