import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  clearVaultError,
  getVaultError,
  getVaultFailedAction
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import { showToast } from '../lib/toast'
import { getVaultErrorText } from '../lib/vaultNames'

const TOASTED_ACTIONS = ['move', 'switch', 'remove']

export function useVaultErrors() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const error = useSelector(getVaultError)
  const failedAction = useSelector(getVaultFailedAction)

  useEffect(() => {
    if (!error || !TOASTED_ACTIONS.includes(failedAction)) return
    showToast(getVaultErrorText(error, t))
    dispatch(clearVaultError())
  }, [error, failedAction, dispatch, t])
}
