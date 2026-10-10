import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  createInvite,
  getInvite,
  getInviteExpiresAt,
  getSyncIsLoading
} from '@pear-notes/core/store/slices/syncSlice.js'
import { getInviteRemainingMs } from '@pear-notes/core/utils.js'

import { copyToClipboard } from '../lib/clipboard'

const COUNTDOWN_TICK_MS = 1000
const EXPIRY_WARNING_MS = 60 * 1000
const COPIED_RESET_MS = 2000

export function useInviteLink(format) {
  const dispatch = useDispatch()
  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const [countdownTick, setCountdownTick] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!inviteCode || !expiresAt) return
    const timer = setInterval(() => setCountdownTick((n) => n + 1), COUNTDOWN_TICK_MS)
    return () => clearInterval(timer)
  }, [inviteCode, expiresAt])

  const remainingMs = useMemo(
    () => getInviteRemainingMs(expiresAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expiresAt, countdownTick]
  )
  const expired = !!inviteCode && !!expiresAt && remainingMs <= 0
  const expiringSoon = !expired && remainingMs > 0 && remainingMs <= EXPIRY_WARNING_MS
  const isGenerated = !!inviteCode && !expired
  const link = inviteCode ? format(inviteCode) : ''

  const generate = () => dispatch(createInvite())

  const copy = async () => {
    if (!isGenerated) return
    const copiedOk = await copyToClipboard(link)
    if (!copiedOk) return
    setCopied(true)
    setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }

  return {
    link,
    isLoading,
    remainingMs,
    expired,
    expiringSoon,
    isGenerated,
    copied,
    generate,
    copy
  }
}
