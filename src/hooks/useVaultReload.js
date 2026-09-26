import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { getVaultEnteredAt } from '@pear-notes/core/store/slices/vaultsSlice.js'

export function useVaultReload() {
  const enteredAt = useSelector(getVaultEnteredAt)
  const seen = useRef(enteredAt)

  useEffect(() => {
    if (!enteredAt || enteredAt === seen.current) return
    seen.current = enteredAt
    window.electronBridge.reload()
  }, [enteredAt])
}
