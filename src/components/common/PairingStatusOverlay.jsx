import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Check, Globe, Link2, Loader2, ShieldCheck } from 'lucide-react'

import { INVITE_KIND } from '@pear-notes/core/constant.js'
import {
  confirmPairing,
  getInviterStatus,
  getReceiverStatus,
  getShowPairingInput,
  rejectPairing,
  resetInvite,
  resetReceiverStatus,
  setShowPairingInput,
  subscribePairUser
} from '@pear-notes/core/store/slices/syncSlice.js'
import {
  extractInvite,
  getFingerprint,
  isInviteForOtherKind,
  isValidInvite
} from '@pear-notes/core/utils.js'

import { getRelativeTime } from '../../utils/relativeTime'
import MergeConfirmModal from '../modals/MergeConfirmModal'

const REQUESTED_AGE_TICK_MS = 30000

export default function PairingStatusOverlay() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [isExiting, setIsExiting] = useState(false)
  const [pasteCode, setPasteCode] = useState('')
  const [pendingInvite, setPendingInvite] = useState(null)
  const [presenceNow, setPresenceNow] = useState(() => Date.now())

  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)
  const showPairingInput = useSelector(getShowPairingInput)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'
  const awaitingConfirmation =
    inviterStatus.step === 'confirmation' || receiverStatus.step === 'confirmation'

  useEffect(() => {
    if (!awaitingConfirmation) return
    const timer = setInterval(() => setPresenceNow(Date.now()), REQUESTED_AGE_TICK_MS)
    return () => clearInterval(timer)
  }, [awaitingConfirmation])

  if (!isInviterActive && !isReceiverActive && !showPairingInput && !isExiting) return null

  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, progress, userData, localKey, requestedAt } = activeStatus

  const getMessage = () => {
    switch (step) {
      case 'clearing_data':
        return t('pairing.overlay.resettingDesc')
      case 'searching':
        return t('pairing.status.searching')
      case 'connected':
        return t('pairing.status.connected')
      case 'authenticating':
        return t('pairing.status.authenticating')
      case 'confirmation':
        return t('pairing.status.confirmation')
      case 'authorizing':
        return t('pairing.status.authorizing')
      case 'initializing_storage':
        return t('pairing.status.initializing')
      case 'replicating_data':
        return t('pairing.status.replicating')
      case 'syncing':
        return t('pairing.status.startingReplication')
      case 'receiving_data': {
        return t('pairing.status.receivingWithCount')
      }
      case 'done':
        return t('pairing.status.done')
      case 'idle':
        return isInviter ? t('pairing.status.waiting') : t('pairing.status.readyToPair')
      default:
        return ''
    }
  }

  const message = getMessage()
  const isDone = step === 'done'
  const isError = step === 'error'
  const isRejected = step === 'rejected'
  const isExpired = step === 'expired'
  const isStepSyncing = [
    'initializing_storage',
    'replicating_data',
    'syncing',
    'receiving_data'
  ].includes(step)
  const isConfirmation = step === 'confirmation'
  const requestedTime = isConfirmation
    ? getRelativeTime(requestedAt, Math.max(presenceNow, requestedAt || 0))
    : null

  const handleAnimatedClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      if (isInviter) {
        dispatch(resetInvite())
      } else {
        dispatch(resetReceiverStatus())
      }
      setIsExiting(false)
    }, 300)
  }

  const handleConfirm = () => {
    dispatch(confirmPairing())
  }

  const handleReject = () => {
    dispatch(rejectPairing())
  }

  const handleResetAfterFailedPairing = () => {
    dispatch(resetReceiverStatus())
  }

  const handleConnect = () => {
    if (isValidInvite(pasteCode, INVITE_KIND.DEVICE)) {
      setPendingInvite(extractInvite(pasteCode))
    }
  }

  const handleConfirmMerge = () => {
    if (!pendingInvite) return
    dispatch(subscribePairUser({ invite: pendingInvite }))
    dispatch(setShowPairingInput(false))
    setPendingInvite(null)
    setPasteCode('')
  }

  const handleCancelMerge = () => {
    setPendingInvite(null)
  }

  const handleCloseInput = () => {
    setIsExiting(true)
    setTimeout(() => {
      dispatch(setShowPairingInput(false))
      setPasteCode('')
      setIsExiting(false)
    }, 300)
  }

  const renderStatusIcon = () => {
    if (isDone)
      return (
        <div className='w-20 h-20 bg-accent-success/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-success/30 mb-2'>
          <Check className='w-10 h-10 text-accent-success' strokeWidth={3} />
        </div>
      )
    if (isConfirmation)
      return (
        <div className='w-20 h-20 bg-accent-primary/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/30 mb-2'>
          <ShieldCheck className='w-10 h-10 text-accent-primary' />
        </div>
      )
    return (
      <div className='relative mb-2 flex items-center justify-center'>
        <div className='w-20 h-20 bg-accent-primary/5 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/10 overflow-hidden relative'>
          <Globe className='w-10 h-10 text-accent-primary opacity-20' />
          <div className='absolute inset-0 bg-gradient-to-t from-accent-primary/10 to-transparent animate-pulse' />
        </div>

        <Loader2
          className='absolute w-24 h-24 text-accent-primary animate-spin opacity-80'
          strokeWidth={1}
        />
        <div className='absolute inset-4 bg-accent-primary/5 blur-2xl rounded-full animate-pulse' />
      </div>
    )
  }

  const renderContent = () => {
    if (isError || isRejected || isExpired) {
      return (
        <div className='flex flex-col items-center text-center space-y-6'>
          <div className='w-20 h-20 bg-accent-danger/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-danger/30 mb-2'>
            <span className='text-4xl'>✕</span>
          </div>
          <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
              {isExpired
                ? t('pairing.overlay.pairingExpiredTitle')
                : isRejected
                  ? t('pairing.overlay.pairingRejectedTitle')
                  : t('pairing.overlay.pairingFailedTitle')}
            </h3>
            <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
              {isExpired
                ? t('pairing.overlay.pairingExpiredDesc')
                : isRejected
                  ? t('pairing.overlay.pairingRejectedDesc')
                  : t('pairing.overlay.pairingFailedDesc')}
            </p>
          </div>
          <button
            onClick={handleResetAfterFailedPairing}
            className='w-full py-4 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger rounded-xl font-bold text-base hover:bg-accent-danger/20 transition-all active:scale-95'
          >
            {t('pairing.overlay.okay')}
          </button>
        </div>
      )
    }

    if (isDone) {
      return (
        <div className='flex flex-col items-center text-center space-y-6'>
          {renderStatusIcon()}
          <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
              {t('pairing.overlay.linkedTitle')}
            </h3>
            <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
              {isInviter ? t('pairing.overlay.linkedInviter') : t('pairing.overlay.linkedReceiver')}
            </p>
          </div>
          <button
            onClick={handleAnimatedClose}
            className='w-full py-4 bg-accent-success/10 border border-accent-success/20 text-accent-success rounded-xl font-bold text-base hover:bg-accent-success/20 transition-all active:scale-95 flex items-center justify-center gap-2'
          >
            {isInviter ? t('pairing.overlay.returnToNotes') : t('pairing.overlay.openWorkspace')}
          </button>
        </div>
      )
    }

    if (isStepSyncing) {
      return (
        <div className='flex flex-col items-center text-center space-y-8'>
          {renderStatusIcon()}
          <div className='space-y-3'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
              {t('pairing.overlay.syncingTitle')}
            </h3>
            <p className='text-text-tertiary text-sm max-w-[240px] leading-relaxed'>
              {t('pairing.overlay.syncingDesc')}
            </p>
          </div>

          <div className='w-full space-y-3'>
            <div className='flex justify-center items-center text-xs font-bold tracking-widest opacity-60'>
              <span className='text-text-tertiary'>
                {message} • {t('pairing.overlay.complete', { progress })}
              </span>
            </div>
            <div className='relative h-2 w-full bg-overlay-subtle rounded-full overflow-hidden border border-overlay-soft'>
              <div
                className='absolute top-0 left-0 h-full bg-accent-primary shadow-[0_0_15px_rgba(var(--accent-primary-rgb),0.5)] transition-all duration-500 rounded-full'
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )
    }

    const peerFingerprint = getFingerprint(userData)
    const myFingerprint = getFingerprint(localKey)

    const mainIdLabel = isConfirmation ? 'REMOTE ID' : 'MY ID'
    const mainIdValue = isConfirmation ? peerFingerprint : myFingerprint
    const subIdLabel = isConfirmation ? 'MY ID' : peerFingerprint ? 'REMOTE ID' : null
    const subIdValue = isConfirmation ? myFingerprint : peerFingerprint ? peerFingerprint : null

    return (
      <div className='flex flex-col items-center text-center space-y-6'>
        <div className='w-20 h-20 bg-accent-primary/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/30 mb-2'>
          <ShieldCheck className='w-10 h-10 text-accent-primary' />
        </div>

        <div className='space-y-2'>
          <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
            {isConfirmation ? t('pairing.overlay.verifyTitle') : t('pairing.overlay.identityTitle')}
          </h3>
          <p className='text-text-tertiary text-sm max-w-[280px] leading-relaxed'>
            {isConfirmation ? t('pairing.overlay.verifyDesc') : t('pairing.overlay.identityDesc')}
          </p>
        </div>

        {mainIdValue && (
          <div className='w-full space-y-4'>
            <div className='px-6 py-4 bg-overlay-subtle border border-overlay-medium rounded-2xl'>
              <span className='text-xs tracking-[0.2em] font-bold text-accent-primary/60 block mb-1'>
                {mainIdLabel}
              </span>
              <span className='text-2xl font-black text-text-primary tracking-[0.3em] font-mono block'>
                {mainIdValue.toUpperCase()}
              </span>
            </div>

            {subIdValue && (
              <div className='flex items-center justify-center gap-2 opacity-40'>
                <span className='text-xs tracking-wider font-bold truncate max-w-[200px]'>
                  {subIdLabel}: {subIdValue.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {isConfirmation && requestedTime && (
          <p className='text-xs font-medium text-text-tertiary'>
            {t('sync.confirm.requestedAt', {
              time:
                requestedTime.count === 0
                  ? t(requestedTime.key)
                  : t(requestedTime.key, { count: requestedTime.count })
            })}
          </p>
        )}

        {isConfirmation ? (
          <div className='flex gap-3 w-full pt-2'>
            <button
              onClick={handleReject}
              className='flex-1 py-4 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger rounded-xl font-bold text-sm hover:bg-accent-danger/20 transition-all active:scale-95'
            >
              {t('pairing.overlay.rejectBtn')}
            </button>
            <button
              onClick={handleConfirm}
              className='flex-1 py-4 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
            >
              {t('pairing.overlay.verifyBtn')}
            </button>
          </div>
        ) : (
          <div className='w-full space-y-3 pt-2'>
            <div className='relative h-1.5 w-full bg-overlay-subtle rounded-full overflow-hidden border border-overlay-soft'>
              <div
                className='absolute top-0 left-0 h-full bg-accent-primary animate-pulse'
                style={{ width: `${progress || 25}%` }}
              />
            </div>
            <div className='flex justify-center items-center text-xs font-bold tracking-widest opacity-40'>
              <span className='text-text-tertiary'>
                {message || t('pairing.status.establishing')}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (showPairingInput && !isInviterActive && !isReceiverActive) {
    return (
      <div className='fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-0'>
        <div
          className={`absolute inset-0 bg-backdrop-light backdrop-blur-xl animate-in ${isExiting ? 'animate-out fade-out' : 'fade-in'} duration-500 cursor-pointer`}
          onClick={handleCloseInput}
        />

        <div
          className={`relative bg-bg-panel/95 backdrop-blur-2xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-500 ease-out overflow-hidden`}
        >
          <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full' />
          <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full' />

          <div className='relative z-10 transition-opacity duration-500'>
            <div className='flex flex-col items-center text-center space-y-6 animate-in slide-in-from-bottom-6 fade-in duration-700 delay-200 fill-mode-both'>
              <div className='w-20 h-20 bg-accent-primary/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/30 mb-2'>
                <Link2 className='w-10 h-10 text-accent-primary' />
              </div>

              <div className='space-y-2'>
                <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
                  {t('pairing.overlay.linkTitle')}
                </h3>
                <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
                  {t('pairing.overlay.linkDesc')}
                </p>
              </div>

              <div className='w-full space-y-4'>
                <div className='space-y-2'>
                  <label className='text-xs tracking-[0.2em] font-bold text-text-tertiary block text-left ml-1'>
                    {t('pairing.overlay.inviteCode')}
                  </label>
                  <input
                    type='text'
                    value={pasteCode}
                    onChange={(e) => setPasteCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    placeholder={t('pairing.overlay.placeholder')}
                    className='w-full px-4 py-3 bg-bg-panel/40 border border-border-primary rounded-xl text-sm text-text-primary placeholder:text-text-tertiary/40 focus:outline-none focus:border-accent-primary/40 focus:bg-bg-panel/60 transition-all text-center font-mono tracking-wider shadow-inner'
                    autoFocus
                  />
                  {isInviteForOtherKind(pasteCode, INVITE_KIND.DEVICE) && (
                    <p className='text-xs font-medium text-accent-danger text-left ml-1'>
                      {t('sync.paste.vaultLinkError')}
                    </p>
                  )}
                  {pasteCode.trim() &&
                    !isInviteForOtherKind(pasteCode, INVITE_KIND.DEVICE) &&
                    !isValidInvite(pasteCode) && (
                    <p className='text-xs text-text-tertiary text-left ml-1'>
                      {t('sync.paste.hintInvalid')}
                    </p>
                  )}
                </div>

                <div className='flex gap-3 w-full pt-2'>
                  <button
                    onClick={handleCloseInput}
                    className='flex-1 py-4 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={!isValidInvite(pasteCode, INVITE_KIND.DEVICE)}
                    className='flex-1 py-4 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed'
                  >
                    {t('pairing.overlay.connectBtn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <MergeConfirmModal
          open={!!pendingInvite}
          onConfirm={handleConfirmMerge}
          onCancel={handleCancelMerge}
        />
      </div>
    )
  }

  return (
    <div className='fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-0'>
      <div
        className={`absolute inset-0 bg-backdrop-light backdrop-blur-xl animate-in ${isExiting ? 'animate-out fade-out' : 'fade-in'} duration-500 cursor-pointer`}
        onClick={isDone ? handleAnimatedClose : undefined}
      />

      <div
        className={`relative bg-bg-panel/95 backdrop-blur-2xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-500 ease-out overflow-hidden`}
      >
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full' />
        <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full' />

        <div className='relative z-10 transition-opacity duration-500'>{renderContent()}</div>
      </div>
    </div>
  )
}
