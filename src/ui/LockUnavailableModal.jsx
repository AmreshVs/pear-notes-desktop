import { KeyRound } from 'lucide-react'

export default function LockUnavailableModal({ open, onSetPassword, onCancel }) {
  if (!open) return null

  return (
    <div className='fixed inset-0 z-[2000] flex items-center justify-center p-6'>
      <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-3xl animate-in fade-in duration-300' onClick={onCancel} />

      <div className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] p-8 max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full' />
        <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full' />

        <div className='relative z-10 flex flex-col space-y-6'>
          <div className='flex flex-col items-center text-center space-y-2'>
            <div className='w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center ring-1 ring-accent-primary/20 mb-2'>
              <KeyRound className='w-6 h-6 text-accent-primary' />
            </div>
            <h3 className='text-lg font-bold text-text-primary'>Set a Note Lock Password</h3>
            <p className='text-text-tertiary text-xs leading-relaxed max-w-[300px]'>
              This device has no biometric authentication or login password set up. Set a custom password to lock your notes.
            </p>
          </div>

          <div className='flex gap-3 w-full'>
            <button
              onClick={onCancel}
              className='flex-1 py-3 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm hover:bg-overlay-medium transition-all active:scale-95'
            >
              Cancel
            </button>
            <button
              onClick={onSetPassword}
              className='flex-1 py-3 bg-accent-primary text-text-primary rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
            >
              Set Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
