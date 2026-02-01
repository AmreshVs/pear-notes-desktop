import { Check, ShieldCheck, Globe, Loader2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { getInviterStatus, getReceiverStatus, resetInvite, resetReceiverStatus, confirmPairing } from '../store/slices/syncSlice'
import { getFingerprint } from '../utils'
import { useState } from 'react'

export default function PairingStatusOverlay() {
  const dispatch = useDispatch()
  const [isExiting, setIsExiting] = useState(false)
  
  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'

  if (!isInviterActive && !isReceiverActive && !isExiting) return null

  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, progress, userData, localKey, data } = activeStatus
  
  const getMessage = () => {
    switch (step) {
      case 'clearing_data': return 'Clearing previous data...'
      case 'searching': return 'Searching for device...'
      case 'connected': return 'Device connected'
      case 'authenticating': return 'Authenticating peer...'
      case 'confirmation': return 'Confirm new device pairing'
      case 'authorizing': return 'Authorizing device...'
      case 'initializing_storage': return 'Initializing storage...'
      case 'replicating_data': return 'Replicating data...'
      case 'syncing': return 'Starting data replication...'
      case 'receiving_data': {
        const notesCount = data || 0
        return `Receiving data... (${notesCount} notes found)`
      }
      case 'done': return 'Sync complete'
      case 'idle': return isInviter ? 'Waiting for device...' : 'Ready to pair'
      default: return ''
    }
  }

  const message = getMessage()
  const isDone = step === 'done'
  const isStepSyncing = ['initializing_storage', 'replicating_data', 'syncing', 'receiving_data'].includes(step)
  const isConfirmation = step === 'confirmation'
  
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
        
        <Loader2 className="absolute w-24 h-24 text-accent-primary animate-spin opacity-80" strokeWidth={1} />
        <div className="absolute inset-4 bg-accent-primary/5 blur-2xl rounded-full animate-pulse" />
      </div>
    )
  }

  const renderContent = () => {
    if (isDone) {
      return (
        <div className="flex flex-col items-center text-center space-y-6">
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
            onClick={handleAnimatedClose}
            className="w-full py-4 bg-accent-success/10 border border-accent-success/20 text-accent-success rounded-xl font-bold text-[15px] hover:bg-accent-success/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Get Started
          </button>
        </div>
      )
    }

    if (isStepSyncing) {
      return (
        <div className="flex flex-col items-center text-center space-y-8">
          {renderStatusIcon()}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Syncing Data</h3>
            <p className="text-text-tertiary text-sm max-w-[240px] leading-relaxed">
              Moving your notes and media to this device...
            </p>
          </div>
          
          <div className="w-full space-y-3">
            <div className="relative h-2 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
              <div 
                className="absolute top-0 left-0 h-full bg-accent-primary shadow-[0_0_15px_rgba(var(--accent-primary-rgb),0.5)] transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold tracking-widest uppercase opacity-40">
              <span className="text-text-tertiary">{progress}% Complete</span>
              <span className="text-accent-primary animate-pulse">{message}</span>
            </div>
          </div>
        </div>
      )
    }

    if (isConfirmation) {
      const myFingerprintFriendly = getFingerprint(userData?.fingerprint || localKey)
      
      return (
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-accent-primary/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/30 mb-2">
            <ShieldCheck className="w-10 h-10 text-accent-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">Verify Secure Code</h3>
            <p className="text-text-tertiary text-sm max-w-[280px] leading-relaxed">
              Ensure both devices display the same identification code.
            </p>
          </div>

          <div className="px-6 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
            <span className="text-2xl font-black text-text-primary tracking-[0.3em] font-mono">
              {myFingerprintFriendly}
            </span>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={handleAnimatedClose}
              className="flex-1 py-4 bg-white/[0.03] border border-white/[0.05] text-text-tertiary rounded-xl font-bold text-sm hover:bg-white/[0.08] hover:text-text-secondary transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 bg-accent-primary text-white rounded-xl font-bold text-[15px] shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95"
            >
              Verify Code
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center text-center space-y-8 py-4">
        {renderStatusIcon()}
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-text-primary tracking-tight">Linking Devices</h3>
          <p className="text-text-tertiary text-sm max-w-[240px] leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-full">
          <div className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary opacity-50">Secure Peer-to-Peer</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-xl animate-in ${isExiting ? 'animate-out fade-out' : 'fade-in'} duration-300 cursor-pointer`}
        onClick={isDone ? handleAnimatedClose : undefined}
      />
      
      <div className={`relative bg-bg-panel/60 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-10 max-w-sm w-full animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-300 ease-out overflow-hidden`}>
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full" />
        
        <div className="relative z-10">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
