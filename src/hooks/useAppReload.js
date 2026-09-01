import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { getNeedsReload, setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'

export function useAppReload() {
  const dispatch = useDispatch()
  const needsReload = useSelector(getNeedsReload)

  useEffect(() => {
    if (!needsReload) return
    dispatch(setNeedsReload(false))
    window.electronBridge.reload()
  }, [needsReload, dispatch])
}
