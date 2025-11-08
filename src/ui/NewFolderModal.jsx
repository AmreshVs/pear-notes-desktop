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
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className='modal-bg rounded-lg w-full max-w-md mx-4 shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='modal-header-bg flex items-center justify-between px-6 py-4 rounded-t-lg'>
          <h2 className='text-primary text-xl font-semibold'>New Folder</h2>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-panel-secondary hover:bg-panel-tertiary flex items-center justify-center text-primary transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className='p-6'>
          <div className='mb-6'>
            <label className='block text-primary text-sm mb-2 font-medium'>Folder Name</label>
            <input
              ref={inputRef}
              type='text'
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder='Enter folder name'
              className='input-field w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent'
              maxLength={50}
            />
            <p className='text-xs mt-2 text-tertiary'>Choose a name for your new folder</p>
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='button-secondary px-6 py-2.5 rounded-lg transition-all text-sm font-medium'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={!folderName.trim()}
              className='btn-primary px-6 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

