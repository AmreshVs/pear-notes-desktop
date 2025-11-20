import { X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function NewFolderModal({ onClose, onCreateFolder }) {
  const [folderName, setFolderName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Focus input when modal opens
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (folderName.trim()) {
      onCreateFolder(folderName.trim())
      setFolderName('')
      onClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm'
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className='bg-bg-panel border border-border-secondary rounded-xl w-full max-w-md mx-4 shadow-xl overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='bg-bg-panel-secondary border-b border-border-primary flex items-center justify-between px-6 py-4'>
          <h2 className='text-text-primary text-xl font-semibold'>New Folder</h2>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-bg-panel-secondary hover:bg-bg-panel-tertiary flex items-center justify-center text-text-primary transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className='p-6 bg-bg-panel'>
          <div className='mb-6'>
            <label className='block text-text-primary text-sm mb-2 font-medium'>Folder Name</label>
            <input
              ref={inputRef}
              type='text'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder='Enter folder name'
              className='w-full px-4 py-2.5 rounded-lg text-sm bg-bg-tertiary border border-border-tertiary text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary'
              maxLength={50}
            />
            <p className='text-xs mt-2 text-text-tertiary'>Choose a name for your new folder</p>
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-6 py-2.5 rounded-lg transition-all text-sm font-medium bg-bg-panel-tertiary hover:bg-bg-panel-secondary text-text-secondary hover:text-text-primary border border-border-tertiary hover:border-border-secondary'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={!folderName.trim()}
              className='px-6 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md bg-accent-primary text-text-primary hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-primary'
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
