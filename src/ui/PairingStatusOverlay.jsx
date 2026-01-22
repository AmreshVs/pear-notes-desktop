import { Check, ShieldCheck, Globe, ShieldAlert, Loader2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { getInviterStatus, getReceiverStatus, resetInvite, resetReceiverStatus, confirmPairing } from '../store/slices/syncSlice'
import { getFingerprint } from '../utils'

export default function PairingStatusOverlay() {
  const dispatch = useDispatch()
  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'

  if (!isInviterActive && !isReceiverActive) return null

  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, message, progress, userData, localKey } = activeStatus
  
  const isDone = step === 'done'
  const isSyncing = step === 'syncing'
  const isConfirmation = step === 'confirmation' || message === 'Confirm new device pairing'
  
  const handleClose = () => {
    if (isInviter) {
      dispatch(resetInvite())
    } else {
      dispatch(resetReceiverStatus())
    }
  }

  const handleConfirm = () => {
    dispatch(confirmPairing())
  }

  const renderStatusIcon = () => {
    if (isDone) return (
      <div className="w-20 h-20 bg-accent-success/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-success/30 mb-2">
        <Check className="w-10 h-10 text-accent-success" strokeWidth={3} />
      </div>
    )
    if (isConfirmation) return (
      <div className="w-20 h-20 bg-accent-primary/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/30 mb-2">
        <ShieldCheck className="w-10 h-10 text-accent-primary" />
      </div>
    )
    return (
      <div className="relative mb-2 flex items-center justify-center">
        <div className="w-20 h-20 bg-accent-primary/5 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/10 overflow-hidden relative">
          <Globe className="w-10 h-10 text-accent-primary opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/10 to-transparent animate-pulse" />
        </div>
        
        {/* Simple, clean, high-fidelity loader */}
        <Loader2 className="absolute w-24 h-24 text-accent-primary animate-spin opacity-80" strokeWidth={1} />

        {/* Outer Glow */}
        <div className="absolute inset-4 bg-accent-primary/5 blur-2xl rounded-full animate-pulse" />
      </div>
    )
  }

  const renderContent = () => {
    if (isDone) {
      return (
        <div className="flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300">
          {renderStatusIcon()}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Device Linked</h3>
            <p className="text-text-tertiary text-sm leading-relaxed max-w-[280px]">
              {isInviter 
                ? 'Your new device has been verified and linked successfully.'
                : 'Welcome! This device is now a secure part of your notes library.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-3.5 bg-accent-success text-white rounded-lg hover:brightness-110 active:scale-95 transition-all font-medium"
          >
            {isInviter ? 'Return to Notes' : 'Open Workspace'}
          </button>
        </div>
      )
    }

    if (isSyncing) {
      return (
        <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
          {renderStatusIcon()}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Syncing Data</h3>
            <div className="flex items-center justify-center gap-2 text-text-tertiary">
              <span className="text-xs font-medium italic animate-pulse">
                {message || 'Moving data across devices...'}
              </span>
            </div>
          </div>

          <div className="w-full space-y-2">
            <div className="w-full bg-border-primary/30 h-2 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-accent-primary to-accent-primary-hover transition-all duration-700 ease-out flex items-center justify-end pr-1 shadow-[0_0_10px_rgba(var(--accent-primary),0.5)]"
                style={{ width: `${progress || 85}%` }}
              >
                 <div className="w-1 h-1 bg-white/40 rounded-full blur-[1px]" />
              </div>
            </div>
            <div className="flex justify-between px-1">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Progress</span>
              <span className="text-[10px] font-bold text-accent-primary">{progress || 85}%</span>
            </div>
          </div>
        </div>
      )
    }

    // Unified Verification / Establishing Layout
    const peerFingerprint = getFingerprint(userData)
    const myFingerprint = getFingerprint(localKey)
    
    // Choose which ID to show prominently
    // If we are confirming, show the remote ID (we're verifying them)
    // If we're establishing/waiting, show our own ID (they're verifying us)
    const mainIdLabel = isConfirmation ? "REMOTE ID" : "MY ID"
    const mainIdValue = isConfirmation ? peerFingerprint : myFingerprint
    const subIdLabel = isConfirmation ? "MY ID" : (peerFingerprint ? "REMOTE ID" : null)
    const subIdValue = isConfirmation ? myFingerprint : (peerFingerprint ? peerFingerprint : null)

    return (
      <div className="flex flex-col items-center text-center space-y-6 animate-in slide-in-from-bottom-4 duration-400">
        <div className="w-20 h-20 bg-accent-primary/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/30 mb-2">
          <ShieldCheck className="w-10 h-10 text-accent-primary" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-text-primary tracking-tight">
            {isConfirmation ? 'Verify Identity' : 'Identity Verification'}
          </h3>
          <p className="text-text-tertiary text-sm leading-relaxed">
            {isConfirmation 
              ? 'Confirm that this secure fingerprint matches the one displayed on your other device.'
              : 'Verifying connection. Please check this fingerprint and authorize on your other device.'}
          </p>
        </div>

        <div className="w-full space-y-4">
          <div className="p-5 bg-bg-panel/60 border border-accent-primary/20 rounded-2xl group transition-all hover:border-accent-primary/40">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-primary/60 block mb-3">{mainIdLabel}</span>
            <div className="font-mono text-base sm:text-lg text-text-primary tracking-tight uppercase leading-none break-all">
              {mainIdValue.toUpperCase()}
            </div>
          </div>

          {subIdValue && (
            <div className="flex items-center justify-center gap-2 opacity-40">
              <ShieldAlert className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider font-bold truncate max-w-[200px]">
                {subIdLabel}: {subIdValue.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {isConfirmation ? (
          <div className="flex flex-col w-full gap-3 pt-2">
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 bg-accent-primary text-text-primary rounded-lg hover:brightness-105 active:scale-95 transition-all font-medium"
            >
              Verify & Authorize
            </button>
            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-bg-panel-secondary border border-border-primary text-text-secondary rounded-lg hover:bg-bg-panel-tertiary transition-all font-medium"
            >
              Deny Connection
            </button>
          </div>
        ) : (
          <div className="w-full space-y-2 pt-4">
            <div className="w-full bg-border-primary/30 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-primary animate-pulse"
                style={{ width: `${progress || 25}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Establishing Link...</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      {/* Immersive backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-700 cursor-pointer"
        onClick={isDone ? handleClose : undefined}
      />
      
      {/* Dialog Card */}
      <div className="relative bg-bg-panel/80 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full" />
        
        {renderContent()}
      </div>
    </div>
  )
}
