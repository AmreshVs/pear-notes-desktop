import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  clearVaultError,
  getVaultEnteredAt,
  getVaultError,
  getVaultFailedAction
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import { showToast } from '../lib/toast'
import { getVaultErrorText } from '../lib/vaultNames'

const TOASTED_ACTIONS = ['move', 'switch']

export function useVaultReload() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const enteredAt = useSelector(getVaultEnteredAt)
  const error = useSelector(getVaultError)
  const failedAction = useSelector(getVaultFailedAction)
  const seen = useRef(enteredAt)

  useEffect(() => {
    if (!enteredAt || enteredAt === seen.current) return
    seen.current = enteredAt
    window.electronBridge.reload()
  }, [enteredAt])

  useEffect(() => {
    if (!error || !TOASTED_ACTIONS.includes(failedAction)) return
    showToast(getVaultErrorText(error, t))
    dispatch(clearVaultError())
  }, [error, failedAction, dispatch, t])
}
