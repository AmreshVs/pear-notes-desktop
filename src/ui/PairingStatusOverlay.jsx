import { Check, Loader2, ShieldAlert, X } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { getInviterStatus, getReceiverStatus, resetInvite, resetReceiverStatus, confirmPairing } from '../store/slices/syncSlice'
import { getFingerprint } from '../utils'

export default function PairingStatusOverlay() {
  const dispatch = useDispatch()
  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'

  console.log('[PairingStatusOverlay] inviterStatus:', inviterStatus)
  console.log('[PairingStatusOverlay] receiverStatus:', receiverStatus)

  if (!isInviterActive && !isReceiverActive) return null

  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, message, progress, userData, localKey } = activeStatus
  
  const isDone = step === 'done'
  const isSyncing = step === 'syncing'
  // More robust check for confirmation step - fallback to message if step is missing
  const isConfirmation = step === 'confirmation' || message === 'Confirm new device pairing'
  
  console.log('[PairingStatusOverlay] Render state:', { 
    isInviter, step, message, isConfirmation, userData: !!userData 
  })

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

  const renderContent = () => {
    if (isDone) {
      return (
        <>
          <div className="w-16 h-16 bg-accent-success/20 rounded-full flex items-center justify-center mb-2">
            <Check className="w-8 h-8 text-accent-success" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary">
              {message || (isInviter ? 'Pairing Complete!' : 'Successfully Connected!')}
            </h3>
            <p className="text-text-tertiary text-sm mt-2 leading-relaxed">
              {isInviter 
                ? 'Your devices are now connected and notes updated.'
                : 'You have successfully joined the sync. Your notes are up to date.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-3 bg-accent-success text-white rounded-xl hover:bg-accent-success/90 transition-all font-semibold shadow-lg shadow-accent-success/20 active:scale-95"
          >
            {isInviter ? 'Done' : 'Start Writing'}
          </button>
        </>
      )
    }

    if (isConfirmation) {
      const fingerprint = getFingerprint(userData)

      return (
        <>
          <div className="w-16 h-16 bg-accent-primary/20 rounded-full flex items-center justify-center mb-2">
            <ShieldAlert className="w-8 h-8 text-accent-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary">Confirm New Device</h3>
            <p className="text-text-tertiary text-sm mt-2 leading-relaxed">
              A device is attempting to pair with you. Confirm if the fingerprint matches on both devices:
            </p>
            <div className="mt-4 p-3 bg-bg-secondary rounded-xl font-mono text-lg text-accent-primary border border-border-secondary">
              {fingerprint}
            </div>
            {localKey && (
              <p className="text-text-tertiary text-[11px] mt-2 uppercase tracking-wider font-semibold opacity-60">
                Your Fingerprint: {getFingerprint(localKey)}
              </p>
            )}
          </div>
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-accent-primary text-white rounded-xl hover:bg-accent-primary/90 transition-all font-semibold shadow-lg shadow-accent-primary/20 active:scale-95"
            >
              Confirm and Sync
            </button>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-transparent text-text-secondary border border-border-secondary rounded-xl hover:bg-bg-secondary transition-all font-semibold active:scale-95 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="relative">
          <div className="w-16 h-16 border-4 border-accent-primary/20 rounded-full"></div>
          <Loader2 className="w-16 h-16 text-accent-primary animate-spin absolute inset-0" strokeWidth={3} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-text-primary">
            {message || (isSyncing ? 'Syncing Notes...' : 'Pairing in Progress...')}
          </h3>
          <p className="text-text-tertiary text-sm mt-2 leading-relaxed italic">
            {isSyncing 
              ? (isInviter ? 'Replicating your data...' : 'Downloading the latest notes...')
              : (isInviter ? 'Waiting for device to sync...' : 'Preparing your workspace...')}
          </p>
          {localKey && (
            <div className="mt-6 flex flex-col items-center">
               <p className="text-text-tertiary text-[11px] uppercase tracking-wider font-semibold opacity-60 mb-2 text-center">
                Your Device Identity
              </p>
              <div className="p-2 px-4 bg-bg-secondary rounded-lg font-mono text-sm text-accent-primary border border-border-secondary inline-block">
                {getFingerprint(localKey)}
              </div>
            </div>
          )}
        </div>
        <div className="w-full bg-border-tertiary h-1.5 rounded-full overflow-hidden mt-2">
          <div 
            className="h-full bg-accent-primary transition-all duration-500 ease-out"
            style={{ width: `${progress || (isSyncing ? 80 : 20)}%` }}
          ></div>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-bg-panel border border-border-secondary rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300">
        {renderContent()}
      </div>
    </div>
  )
}
