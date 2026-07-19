import { Fingerprint } from 'lucide-react'

export default function LockUnavailableModal({ open, onCancel }) {
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
              <Fingerprint className='w-6 h-6 text-accent-primary' />
            </div>
            <h3 className='text-lg font-bold text-text-primary'>Device Lock Unavailable</h3>
            <p className='text-text-tertiary text-xs leading-relaxed max-w-[300px]'>
              This device has no biometric authentication or login password set up, so notes can&apos;t be locked or unlocked here. Set up device security, or change the lock method from another synced device.
            </p>
          </div>

          <button
            onClick={onCancel}
            className='w-full py-3 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
