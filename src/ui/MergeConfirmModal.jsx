import { createPortal } from 'react-dom'
import { Link2 } from 'lucide-react'

export default function MergeConfirmModal({ open, onConfirm, onCancel }) {
  if (!open) return null

  return createPortal(
    <div className='fixed inset-0 z-[2100] flex items-center justify-center p-6 sm:p-0'>
      <div
        className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-300'
        onClick={onCancel}
      />

      <div className='relative bg-bg-panel/95 backdrop-blur-2xl border border-border-primary rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]'>
        <div className='absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full' />
        <div className='absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full' />

        <div className='relative z-10 flex flex-col items-center text-center space-y-6'>
          <div className='w-20 h-20 bg-accent-primary/10 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/20 mb-2'>
            <Link2 className='w-10 h-10 text-accent-primary' />
          </div>

          <div className='space-y-2'>
            <h3 className='text-2xl font-bold text-text-primary tracking-tight'>Combine This Device?</h3>
            <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
              Notes, folders, and media on this device will be merged into the linked vault. Nothing on this device will be deleted.
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
              onClick={onConfirm}
              className='flex-1 py-3 bg-accent-primary text-text-primary rounded-xl font-bold text-sm shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
            >
              Combine &amp; Link
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
