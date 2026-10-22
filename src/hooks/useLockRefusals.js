import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { LOCK_REFUSAL } from '@pear-notes/core/constant.js'
import { getLockRefusal, setLockRefusal } from '@pear-notes/core/store/slices/notesSlice.js'

import { showToast } from '../lib/toast'

const MESSAGE_KEYS = {
  [LOCK_REFUSAL.FILES_MISSING]: 'noteLockPassword.filesMissing',
  [LOCK_REFUSAL.FILES_SEALED]: 'noteLockPassword.filesSealed'
}

export function useLockRefusals() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const refusal = useSelector(getLockRefusal)

  useEffect(() => {
    if (!refusal) return
    const key = MESSAGE_KEYS[refusal.reason]
    if (key) showToast(t(key))
    dispatch(setLockRefusal(null))
  }, [refusal, dispatch, t])
}
