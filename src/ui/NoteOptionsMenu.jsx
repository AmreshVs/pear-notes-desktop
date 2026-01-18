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
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (showMenu && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 220 // Align to right of button
      })
    }
  }, [showMenu, buttonRef])

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
    <div className='relative'>
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className={`w-8 h-8 rounded-md transition-all flex items-center justify-center ${
          showMenu ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
        }`}
        title='More options'
      >
        <MoreHorizontal className='w-4 h-4' />
      </button>

      {showMenu && (
        <div 
          ref={menuRef}
          className='fixed z-50 bg-bg-panel border border-border-secondary rounded-xl shadow-2xl w-[220px] py-1.5 animate-in zoom-in-95 fade-in duration-200 origin-top-right'
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {/* Move To Option */}
          <div className='relative group'>
            <div 
              onMouseEnter={() => setShowMoveSubmenu(true)}
              className={`px-3 py-2 hover:bg-bg-tertiary transition-colors cursor-pointer flex items-center justify-between group/item ${showMoveSubmenu ? 'bg-bg-tertiary' : ''}`}
            >
              <div className='flex items-center gap-3'>
                <Folder className='w-4 h-4 text-text-secondary group-hover/item:text-text-primary' />
                <span className='text-[13px] text-text-primary'>Move to</span>
              </div>
              <ChevronRight className='w-3.5 h-3.5 text-text-tertiary' />
            </div>

            {showMoveSubmenu && (
              <div 
                className='absolute top-0 right-full mr-1 bg-bg-panel border border-border-secondary rounded-xl shadow-2xl w-[200px] py-1.5 animate-in slide-in-from-right-2 fade-in duration-200'
                onMouseLeave={() => setShowMoveSubmenu(false)}
              >
                {availableFolders.length > 0 ? (
                  availableFolders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        onMoveTo(folder.id)
                        setShowMenu(false)
                      }}
                      className='px-3 py-2 hover:bg-bg-tertiary transition-colors cursor-pointer flex items-center gap-3'
                    >
                      <Folder className='w-4 h-4 text-text-secondary' />
                      <span className='text-[13px] text-text-primary truncate'>{folder.name}</span>
                    </div>
                  ))
                ) : (
                  <div className='px-3 py-2 text-[13px] text-text-tertiary italic'>
                    No other folders available
                  </div>
                )}
              </div>
            )}
          </div>

          <div className='h-px bg-border-primary my-1' />

          {/* Copy Option */}
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
            className='px-3 py-2 hover:bg-bg-tertiary transition-colors cursor-pointer flex items-center justify-between group/copy'
          >
            <div className='flex items-center gap-3'>
              {copied ? (
                <Check className='w-4 h-4 text-accent-success' />
              ) : (
                <Copy className='w-4 h-4 text-text-secondary group-hover/copy:text-text-primary' />
              )}
              <span className={`text-[13px] ${copied ? 'text-accent-success font-medium' : 'text-text-primary'}`}>
                {copied ? 'Copied' : 'Copy to clipboard'}
              </span>
            </div>
          </div>

          <div className='h-px bg-border-primary my-1' />


          {/* Delete Option */}
          <div 
            onClick={() => {
              onDelete()
              setShowMenu(false)
            }}
            className='px-3 py-2 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-3 group/delete'
          >
            <Trash2 className='w-4 h-4 text-red-500/70 group-hover/delete:text-red-500' />
            <span className='text-[13px] text-red-500/90 group-hover/delete:text-red-500 font-medium'>Delete</span>
          </div>
        </div>
      )}
    </div>
  )
}
