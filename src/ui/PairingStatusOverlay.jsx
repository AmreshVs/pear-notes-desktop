import { Check, Loader2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { getInviterStatus, getReceiverStatus, resetInvite, resetReceiverStatus } from '../store/slices/syncSlice'

export default function PairingStatusOverlay() {
  const dispatch = useDispatch()
  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)

  const isInviterActive = inviterStatus.step !== 'idle'
  const isReceiverActive = receiverStatus.step !== 'idle'

  if (!isInviterActive && !isReceiverActive) return null

  const activeStatus = isInviterActive ? inviterStatus : receiverStatus
  const isInviter = isInviterActive
  const { step, message, progress } = activeStatus
  const isDone = step === 'done'
  const isSyncing = step === 'syncing'
  const isConfirmed = step === 'confirmed'

  const handleClose = () => {
    if (isInviter) {
      dispatch(resetInvite())
    } else {
      dispatch(resetReceiverStatus())
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-bg-panel border border-border-secondary rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-300">
        {isDone ? (
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
        ) : (
          <>
            <div className="relative">
              <div className="w-16 h-16 border-4 border-accent-primary/20 rounded-full"></div>
              <Loader2 className="w-16 h-16 text-accent-primary animate-spin absolute inset-0" strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary">
                {message || (isSyncing ? 'Syncing Notes...' : isConfirmed ? 'Establishing Connection...' : 'Pairing in Progress...')}
              </h3>
              <p className="text-text-tertiary text-sm mt-2 leading-relaxed italic">
                {isSyncing 
                  ? (isInviter ? 'Replicating your data...' : 'Downloading the latest notes...')
                  : (isInviter ? 'Waiting for device to sync...' : 'Preparing your workspace...')}
              </p>
            </div>
            <div className="w-full bg-border-tertiary h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-primary transition-all duration-500 ease-out"
                style={{ width: `${progress || (isSyncing ? 80 : isConfirmed ? 50 : 20)}%` }}
              ></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
