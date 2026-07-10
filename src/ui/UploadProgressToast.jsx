import { Upload, X } from 'lucide-react'
import { useCurrentUpload } from '../lib/uploadRegistry'

export default function UploadProgressToast() {
  const upload = useCurrentUpload()

  if (!upload) return null

  return (
    <div className='fixed bottom-6 left-6 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300'>
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary'>
          <Upload className='w-5 h-5' />
        </div>

        <div className='flex-1 min-w-0'>
          <h4 className='text-text-primary font-semibold text-sm truncate'>Uploading…</h4>
          <p className='text-text-tertiary text-xs truncate'>{upload.fileName}</p>
        </div>

        <span className='text-text-tertiary text-xs font-semibold shrink-0'>{upload.progress}%</span>

        {upload.cancel && (
          <button
            onClick={upload.cancel}
            className='w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all shrink-0'
            title='Cancel'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      <div className='w-full h-1.5 bg-bg-primary rounded-full overflow-hidden'>
        <div
          className='h-full bg-accent-primary transition-all duration-300'
          style={{ width: `${upload.progress}%` }}
        />
      </div>
    </div>
  )
}
