import { useState, useEffect, useRef } from 'react'
import { MoreHorizontal, Folder, Trash2, ChevronRight, Copy, Check } from 'lucide-react'
import { ALL_NOTES_KEY } from '../constant'

export default function NoteOptionsMenu({ 
  folders, 
  currentFolderKey, 
  onMoveTo, 
  onCopy,
  onDelete, 
  buttonRef 
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) {
        setShowMenu(false)
        setShowMoveSubmenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu, buttonRef])

  const availableFolders = folders.filter(f => 
    !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== currentFolderKey
  )

  return (
    <div className='relative flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-xl bg-bg-panel/60 backdrop-blur-xl border border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-fit transition-all duration-300 hover:bg-bg-panel/80 hover:border-white/[0.1]'>
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center active:scale-95 duration-200 ${
          showMenu ? 'bg-accent-primary text-text-primary shadow-[0_0_15px_rgba(var(--accent-primary),0.2)]' : 'text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary'
        }`}
        title='More options'
      >
        <MoreHorizontal className='w-5 h-5' strokeWidth={2.5} />
      </button>

      {showMenu && (
        <div 
          ref={menuRef}
          className='absolute top-full right-0 mt-3 z-[120] bg-bg-panel backdrop-blur-2xl border border-white/[0.08] rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[220px] p-2 animate-in zoom-in-95 fade-in duration-300 origin-top-right overflow-visible'
        >
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent-primary/10 blur-[40px] rounded-full pointer-events-none" />
          <div className='relative z-10'>
            <div 
              onMouseEnter={() => setShowMoveSubmenu(true)}
              className={`px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center justify-between group/item ${showMoveSubmenu ? 'bg-accent-primary/10' : ''}`}
            >
              <div className='flex items-center gap-3'>
                <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover/item:bg-accent-primary/20 transition-colors">
                  <Folder className='w-4 h-4' />
                </div>
                <span className='text-[13px] font-bold text-text-primary tracking-tight'>Move to</span>
              </div>
              <ChevronRight className='w-4 h-4 text-text-tertiary' />
            </div>

            {showMoveSubmenu && (
              <div 
                className='absolute top-0 right-full mr-2 bg-bg-panel backdrop-blur-2xl border border-white/[0.08] rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[180px] p-2 animate-in slide-in-from-right-2 fade-in duration-300 overflow-hidden'
                onMouseLeave={() => setShowMoveSubmenu(false)}
              >
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent-primary/10 blur-[40px] rounded-full pointer-events-none" />
                <div className='relative z-10'>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-3 opacity-60">Destinations</div>
                {availableFolders.length > 0 ? (
                  availableFolders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        onMoveTo(folder.id)
                        setShowMenu(false)
                      }}
                      className='px-3 py-2.5 rounded-lg hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95 group/dest'
                    >
                      <div className="w-6 h-6 rounded-md bg-bg-tertiary/50 flex items-center justify-center text-accent-primary group-hover/dest:bg-accent-primary/20">
                        <Folder className='w-3.5 h-3.5' />
                      </div>
                      <span className='text-[12px] font-bold text-text-primary truncate tracking-tight'>{folder.name}</span>
                    </div>
                  ))
                ) : (
                  <div className='px-3 py-3 text-[11px] text-text-tertiary italic text-center'>
                    Target list empty
                  </div>
                )}
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-white/[0.05] my-1 mx-2" />

          <div 
            onClick={async () => {
              const textToCopy = onCopy()
              if (!textToCopy) return
              
              try {
                await navigator.clipboard.writeText(textToCopy)
                setCopied(true)
                setTimeout(() => {
                  setCopied(false)
                  setShowMenu(false)
                }, 1500)
              } catch (err) {
                console.error('Failed to copy text: ', err)
              }
            }}
            className='px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center justify-between group/copy active:scale-95'
          >
            <div className='flex items-center gap-3'>
              <div className={`w-7 h-7 rounded-lg ${copied ? 'bg-accent-success/20 text-accent-success' : 'bg-bg-tertiary text-accent-primary group-hover/copy:bg-accent-primary/20'} flex items-center justify-center transition-colors`}>
                {copied ? <Check className='w-4 h-4' strokeWidth={3} /> : <Copy className='w-4 h-4' />}
              </div>
              <span className={`text-[13px] font-bold tracking-tight ${copied ? 'text-accent-success' : 'text-text-primary'}`}>
                {copied ? 'Copied Note' : 'Copy Note'}
              </span>
            </div>
          </div>

          <div className="h-px bg-white/[0.05] my-1 mx-2" />

          <div 
            onClick={() => {
              onDelete()
              setShowMenu(false)
            }}
            className='px-4 py-3 rounded-xl hover:bg-accent-danger/10 transition-all cursor-pointer flex items-center gap-3 group/delete active:scale-95'
          >
            <div className="w-7 h-7 rounded-lg bg-bg-tertiary/50 flex items-center justify-center text-accent-danger/70 group-hover/delete:bg-accent-danger/20 transition-colors">
              <Trash2 className='w-4 h-4' />
            </div>
            <span className='text-[13px] text-accent-danger/90 font-black tracking-tight'>Delete</span>
          </div>
        </div>
      )}
    </div>
  )
}
