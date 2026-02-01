import { useState, useEffect, useRef } from 'react'

export default function NewFolderModal({ onClose, onCreateFolder }) {
  const [folderName, setFolderName] = useState('')
  const [isExiting, setIsExiting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleAnimatedClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 300)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (folderName.trim()) {
      onCreateFolder(folderName.trim())
      setFolderName('')
      handleAnimatedClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleAnimatedClose()
    }
  }

  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-[110] p-6'
      onKeyDown={handleKeyDown}
    >
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-xl animate-in ${isExiting ? 'animate-out fade-out' : 'fade-in'} duration-300 cursor-pointer`}
        onClick={handleAnimatedClose}
      />

      <div
        className={`relative bg-bg-panel/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-8 max-w-sm w-full animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-300 ease-out overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-primary/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-[80px] rounded-full" />
        
        <div className='relative z-10 text-center space-y-5'>
          <div className="flex flex-col items-center gap-1.5">
            <h2 className='text-text-primary text-xl font-bold tracking-tight'>New Folder</h2>
            <p className='text-text-tertiary text-[13px] opacity-70 max-w-[220px]'>Organize your library with a dedicated workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='relative group'>
              <input
                ref={inputRef}
                type='text'
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder='Folder name'
                className='w-full px-4 py-3 bg-bg-panel/40 border border-white/5 rounded-xl text-text-primary font-medium text-[14px] shadow-inner outline-none transition-all group-hover:border-border-primary focus:border-accent-primary focus:bg-bg-panel/60'
                maxLength={50}
              />
            </div>

            <div className='flex flex-col gap-2.5 pt-1'>
              <button
                type='submit'
                disabled={!folderName.trim()}
                className='w-full py-3 bg-accent-primary text-text-primary rounded-xl font-bold text-[14px] hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-primary/10'
              >
                Create Folder
              </button>
              <button
                type='button'
                onClick={handleAnimatedClose}
                className='w-full py-2.5 bg-white/[0.03] border border-white/[0.05] text-text-secondary rounded-xl hover:bg-white/[0.08] hover:text-text-primary transition-all font-bold text-[14px] active:scale-95'
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
