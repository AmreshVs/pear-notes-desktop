import { useState } from 'react'
import { useDispatch } from 'react-redux'

import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'

import { deleteDbEncryptionKey } from '../utils.js'

export function useClearAllData() {
  const dispatch = useDispatch()
  const [isClearing, setIsClearing] = useState(false)

  const clearAll = () => {
    setIsClearing(true)
    deleteDbEncryptionKey()
    dispatch(clearStorage())
  }

  return { isClearing, clearAll }
}
