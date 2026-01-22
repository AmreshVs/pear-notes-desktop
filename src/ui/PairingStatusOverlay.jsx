import { Check, Loader2, ShieldCheck, Smartphone, Globe, ShieldAlert } from 'lucide-react'
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
      <div className="relative mb-2">
        <div className="w-20 h-20 bg-accent-primary/5 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/10 overflow-hidden relative">
          <Globe className="w-10 h-10 text-accent-primary opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/10 to-transparent animate-pulse" />
        </div>
        {/* Outer Ring */}
        <Loader2 className="w-24 h-24 text-accent-primary animate-spin absolute -inset-2 opacity-40 blur-[1px]" strokeWidth={1} />
        {/* Inner Ring - Counter-spinning */}
        <div className="absolute -inset-1 border-2 border-accent-primary/60 border-t-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse] opacity-80" />
        {/* Glow core */}
        <div className="absolute inset-4 bg-accent-primary/10 blur-xl rounded-full animate-pulse" />
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
            className="w-full py-4 bg-accent-success text-white rounded-2xl hover:brightness-110 active:scale-95 transition-all font-bold"
          >
            {isInviter ? 'Return to Notes' : 'Open Workspace'}
          </button>
        </div>
      )
    }

    if (isConfirmation) {
      const peerFingerprint = getFingerprint(userData)
      const myFingerprint = getFingerprint(localKey)

      return (
        <div className="flex flex-col items-center text-center space-y-6 animate-in slide-in-from-bottom-4 duration-400">
          {renderStatusIcon()}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Verify Identity</h3>
            <p className="text-text-tertiary text-sm leading-relaxed">
              Confirm that this secure fingerprint matches the one displayed on your other device.
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="p-5 bg-bg-panel/60 border border-accent-primary/30 rounded-2xl group">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-primary opacity-80 block mb-3">Remote Device Identity</span>
              <div className="font-mono text-2xl text-text-primary tracking-widest break-all">
                {peerFingerprint}
              </div>
            </div>

            {myFingerprint && (
              <div className="flex items-center justify-center gap-2 opacity-50">
                <ShieldAlert className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-wider font-bold truncate max-w-[200px]">
                  My ID: {myFingerprint}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col w-full gap-3 pt-2">
            <button
              onClick={handleConfirm}
              className="w-full py-4 bg-accent-primary text-text-primary rounded-2xl hover:brightness-105 active:scale-95 transition-all font-bold"
            >
              Verify & Authorize
            </button>
            <button
              onClick={handleClose}
              className="w-full py-4 bg-bg-panel-secondary border border-border-primary text-text-secondary rounded-2xl hover:bg-bg-panel-tertiary transition-all font-semibold"
            >
              Deny Connection
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-500">
        {renderStatusIcon()}
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-text-primary tracking-tight">
            {isSyncing ? 'Syncing Data' : 'Establishing Secure Link'}
          </h3>
          <div className="flex items-center justify-center gap-2 text-text-tertiary">
            <span className="text-xs font-medium italic animate-pulse">
              {message || (isSyncing ? 'Moving data across devices...' : 'Waiting for connection...')}
            </span>
          </div>
        </div>

        <div className="w-full space-y-2">
          <div className="w-full bg-border-primary/30 h-2 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-accent-primary to-accent-primary-hover transition-all duration-700 ease-out flex items-center justify-end pr-1 shadow-[0_0_10px_rgba(var(--accent-primary),0.5)]"
              style={{ width: `${progress || (isSyncing ? 85 : 25)}%` }}
            >
               <div className="w-1 h-1 bg-white/40 rounded-full blur-[1px]" />
            </div>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Progress</span>
            <span className="text-[10px] font-bold text-accent-primary">{progress || (isSyncing ? 85 : 25)}%</span>
          </div>
        </div>

        {localKey && !isSyncing && (
          <div className="pt-4 border-t border-border-primary/50 w-full">
            <div className="flex items-center justify-center gap-2 mb-2 text-text-muted">
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Your Device Identity</span>
            </div>
            <div className="inline-block px-3 py-1 bg-bg-panel-secondary border border-border-primary rounded-lg font-mono text-[11px] text-text-tertiary select-all">
              {getFingerprint(localKey)}
            </div>
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
