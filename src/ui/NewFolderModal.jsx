import { useState, useEffect, useRef } from 'react'

export default function NewFolderModal({ onClose, onCreateFolder }) {
  const [folderName, setFolderName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
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
      className='fixed inset-0 flex items-center justify-center z-[110] p-6'
      onKeyDown={handleKeyDown}
    >
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-700 cursor-pointer"
        onClick={onClose}
      />

      <div
        className="relative bg-bg-panel/80 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full" />

        <div className='relative z-10 text-center space-y-6'>
          <div className="flex flex-col items-center gap-2">
            <h2 className='text-text-primary text-2xl font-bold tracking-tight'>New Folder</h2>
            <p className='text-text-tertiary text-sm max-w-[240px]'>Organize your library with a dedicated workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='relative group'>
              <input
                ref={inputRef}
                type='text'
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder='Folder name'
                className='w-full px-5 py-4 bg-bg-panel/50 border border-border-secondary rounded-xl text-text-primary font-medium text-base shadow-inner outline-none transition-all group-hover:border-border-primary focus:border-accent-primary'
                maxLength={50}
              />
            </div>

            <div className='flex flex-col gap-3 pt-2'>
              <button
                type='submit'
                disabled={!folderName.trim()}
                className='w-full py-4 bg-accent-primary text-text-primary rounded-xl font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Create Folder
              </button>
              <button
                type='button'
                onClick={onClose}
                className='w-full py-3.5 bg-bg-panel-secondary/50 border border-border-primary text-text-secondary rounded-xl hover:bg-bg-panel-tertiary transition-all font-medium active:scale-95'
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
