import { Trash2, Search, Loader2, SquarePen, Folder, Copy, MoreVertical, ChevronRight, PanelLeft } from 'lucide-react'
import { useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { deleteNote, getNoteData, getFilteredNotes, getSelectedNote, setSelectedNote, updateNote } from '../store/slices/notesSlice'
import { getFolders } from '../store/slices/foldersSlice'
import { getInviterStatus } from '../store/slices/syncSlice'
import { RECENTLY_DELETED_KEY, ALL_NOTES_KEY } from '../constant'
import { formatDate, getGroupTitle, getPreview, NOTES_LIST_GROUP } from '../utils'

const NotesItem = ({ noteKey: key, openMenuId, onMenuToggle, onMenuAction, allFolders, menuRef, selectedFolder }) => {
  const dispatch = useDispatch()
  const noteData = useSelector(getNoteData(key))
  const selectedNote = useSelector(getSelectedNote)
  const isSelected = selectedNote === key
  const isMenuOpen = openMenuId === key
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false)
  const moveButtonRef = useRef(null)
  const hoverTimeoutRef = useRef(null)
  const [submenuPos, setSubmenuPos] = useState({ x: 0, y: 0 })

  const availableMoveFolders = allFolders.filter(f => 
    !f.isTrash && 
    f.id !== ALL_NOTES_KEY && 
    f.id !== noteData?.folderKey
  )

  const handleSelectNote = useCallback((key) => {
    dispatch(setSelectedNote(key))
  }, [dispatch])

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setShowMoveSubmenu(true)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowMoveSubmenu(false)
    }, 150)
  }

  useEffect(() => {
    if (showMoveSubmenu && moveButtonRef.current) {
      const rect = moveButtonRef.current.getBoundingClientRect()
      setSubmenuPos({
        x: rect.right - 4, 
        y: rect.top - 8
      })
    }
  }, [showMoveSubmenu])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <div
        key={key}
        onClick={() => handleSelectNote(key)}
        className={`relative px-6 py-3 cursor-pointer transition-all duration-300 group border-b border-white/[0.03]
          ${
            isSelected
              ? 'bg-accent-primary/5 shadow-inner'
              : 'bg-transparent hover:bg-white/[0.02]'
          }`}
      >
        <div className='flex items-stretch justify-between gap-3'>
          <div className='flex-1 min-w-0 flex flex-col'>
            <h3
              className={`text-[15px] truncate tracking-tight mb-0.5
                ${isSelected ? 'text-accent-primary font-bold' : 'text-text-primary font-bold transition-colors group-hover:text-accent-primary/80'}`}
            >
              {noteData?.title || 'Untitled'}
            </h3>
            <p
              className={`text-[12px] line-clamp-2 leading-relaxed opacity-80
                ${isSelected ? 'text-text-primary' : 'text-text-primary/70'}`}
            >
              {getPreview(noteData?.note, noteData?.note)}
            </p>
            {selectedFolder === ALL_NOTES_KEY && noteData?.folderKey && (
              <div className='flex items-center gap-1.5 mt-2 opacity-50 text-[10px] font-bold uppercase tracking-wider'>
                <Folder className='w-3 h-3' />
                <span>
                  {allFolders.find(f => f.id === noteData.folderKey)?.name || 'Notes'}
                </span>
              </div>
            )}
          </div>
          
          <div className='relative flex flex-col items-end justify-between py-0.5 flex-shrink-0 ml-4 min-w-[70px] uppercase'>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMenuToggle(key)
              }}
              className={`menu-toggle-button opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-bg-tertiary/60 transition-all ${isMenuOpen ? 'opacity-100 bg-bg-tertiary/60' : ''}`}
              title='Options'
            >
              <MoreVertical className='w-3.5 h-3.5' />
            </button>

            <span className="text-[10px] font-medium text-text-primary/50 uppercase tracking-wider whitespace-nowrap">
              {formatDate(noteData?.updatedAt || noteData?.createdAt)}
            </span>

            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-12 z-50 w-[220px] bg-bg-panel border border-white/[0.08] rounded-[1.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-2 animate-in zoom-in-95 fade-in duration-200 origin-top-right overflow-hidden"
              >
                <div className='relative z-10'>
                  <button 
                    type="button"
                    ref={moveButtonRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className={`w-full px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center justify-between group/item ${showMoveSubmenu ? 'bg-accent-primary/10' : ''}`}
                  >
                    <div className='flex items-center gap-3'>
                      <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover/item:bg-accent-primary/20 transition-colors">
                        <Folder className='w-4 h-4' />
                      </div>
                      <span className='text-[13px] font-bold text-text-primary tracking-tight'>Move to</span>
                    </div>
                    <ChevronRight className='w-4 h-4 text-text-tertiary' />
                  </button>

                  {showMoveSubmenu && createPortal(
                    <div 
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      className="submenu-portal fixed z-[9999] w-[180px] bg-bg-panel border border-white/[0.08] rounded-[1.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-2 animate-in fade-in duration-200 overflow-hidden"
                      style={{ 
                          left: `${submenuPos.x}px`, 
                          top: `${submenuPos.y}px` 
                      }}
                    >
                      <div className='relative z-10'>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-3 opacity-60">Destinations</div>
                        <div className="max-h-60 overflow-y-auto scrollbar-hide">
                          {availableMoveFolders.length > 0 ? (
                            availableMoveFolders.map(folder => (
                              <button
                                type="button"
                                key={folder.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  onMenuAction('move', key, folder.id)
                                  setShowMoveSubmenu(false)
                                }}
                                className='w-full px-3 py-2.5 rounded-lg hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95 group/dest text-left'
                              >
                                <div className="w-6 h-6 rounded-md bg-bg-tertiary/50 flex items-center justify-center text-accent-primary group-hover/dest:bg-accent-primary/20">
                                  <Folder className='w-3.5 h-3.5' />
                                </div>
                                <span className='text-[12px] font-bold text-text-primary truncate tracking-tight'>{folder.name}</span>
                              </button>
                            ))
                          ) : (
                            <div className='px-3 py-3 text-[11px] text-text-tertiary italic text-center'>
                              Target list empty
                            </div>
                          )}
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}

                  <div className="h-px bg-white/[0.05] my-1 mx-2" />

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMenuAction('copy', key)
                    }}
                    className='w-full px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 group/copy active:scale-95 text-left'
                  >
                    <div className="w-7 h-7 rounded-lg bg-bg-tertiary text-accent-primary group-hover/copy:bg-accent-primary/20 flex items-center justify-center transition-colors">
                      <Copy className='w-4 h-4' />
                    </div>
                    <span className='text-[13px] font-bold text-text-primary tracking-tight'>Copy Note</span>
                  </button>

                  <div className="h-px bg-white/[0.05] my-1 mx-2" />

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMenuAction('delete', key)
                    }}
                    className='w-full px-4 py-3 rounded-xl hover:bg-accent-danger/10 transition-all cursor-pointer flex items-center gap-3 group/delete active:scale-95 text-left'
                  >
                    <div className="w-7 h-7 rounded-lg bg-bg-tertiary/50 flex items-center justify-center text-accent-danger/70 group-hover/delete:bg-accent-danger/20 transition-colors">
                      <Trash2 className='w-4 h-4' />
                    </div>
                    <span className='text-[13px] text-accent-danger/90 font-black tracking-tight'>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NotesList({
  selectedFolder,
  searchQuery,
  onSearchChange,
  onCreateNote,
  onToggleSidebar
}) {
  const dispatch = useDispatch()
  const filteredNotes = useSelector(getFilteredNotes)
  const folders = useSelector(getFolders)
  const { step } = useSelector(getInviterStatus)
  const syncing = step === 'syncing'
  const currentFolderName = folders.find(f => f.id === selectedFolder)?.name || 'All Notes'
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.menu-toggle-button')) return
      if (e.target.closest('.submenu-portal')) return
      if (openMenuId && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  const handleMenuToggle = useCallback((noteKey) => {
    setOpenMenuId(prev => prev === noteKey ? null : noteKey)
  }, [])

  const handleMenuAction = useCallback(async (action, noteKey, folderId) => {
    setOpenMenuId(null)
    const noteData = filteredNotes.find(n => n.key === noteKey)
    
    switch (action) {
      case 'move':
        dispatch(updateNote({ 
          key: noteKey, 
          folderKey: folderId
        }))
        break
      case 'copy': {
        const text = noteData?.value?.note || ''
        try {
          const parser = new DOMParser()
          const doc = parser.parseFromString(text, 'text/html')
          const cleanText = doc.body.textContent || doc.body.innerText || ''
          await navigator.clipboard.writeText(cleanText)
        } catch (e) {
          console.error('Failed to copy', e)
        }
        break
      }
      case 'delete':
        if (selectedFolder === RECENTLY_DELETED_KEY) {
          if (window.confirm('Are you sure you want to permanently delete this note?')) {
            dispatch(deleteNote(noteKey))
          }
        } else {
          dispatch(deleteNote(noteKey))
        }
        break
    }
  }, [dispatch, filteredNotes, selectedFolder])

  const renderNotesList = useCallback((note) => {
    return (
      <NotesItem 
        key={note.key} 
        noteKey={note.key} 
        openMenuId={openMenuId}
        onMenuToggle={handleMenuToggle}
        onMenuAction={handleMenuAction}
        allFolders={folders}
        menuRef={menuRef}
        selectedFolder={selectedFolder}
      />
    )
  }, [openMenuId, folders, handleMenuToggle, handleMenuAction, selectedFolder])

  return (
    <div className='flex flex-col h-full w-full bg-bg-secondary/40 backdrop-blur-xl border-r border-border-primary/50 relative overflow-hidden'>
      <div className='px-6 pt-10 pb-4 border-b border-border-primary/30 min-h-[140px] flex flex-col gap-4'>
        <div className='flex items-center justify-between h-[40px]'>
          <div className='flex items-center gap-4'>
            <button
              onClick={onToggleSidebar}
              className='p-2 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary border border-white/5 text-text-primary active:scale-95 transition-all duration-200'
              title='Toggle Sidebar'
            >
              <PanelLeft className='w-5 h-5' />
            </button>
            <div className='flex flex-col min-w-0'>
              <h2 className='font-bold text-[20px] text-text-primary tracking-tight truncate max-w-[150px] leading-tight'>
                {currentFolderName}
              </h2>
              <span className='text-[11px] font-bold text-text-tertiary opacity-50 uppercase tracking-wider'>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>
          </div>
          
          <div className='flex items-center gap-1.5'>
            <button
              onClick={onCreateNote}
              className='p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-white/5 text-text-primary active:scale-95 transition-all duration-200'
              title='New Note'
            >
              <SquarePen className='w-5 h-5' />
            </button>
          </div>
        </div>

        <div className='mt-2'>
          
          <div className='relative group'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-accent-primary transition-colors' />
            <input
              type='text'
              placeholder='Search notes...'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className='w-full pl-9 pr-4 py-2.5 rounded-xl text-[14px] focus:outline-none bg-bg-tertiary/30 text-text-primary placeholder-text-tertiary/40 border border-border-primary/50 focus:border-accent-primary/40 focus:bg-bg-tertiary/60 transition-all shadow-inner'
            />
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto py-2 scrollbar-hide'>
        {filteredNotes.length === 0 ? (
          <div className='p-12 text-center'>
            {syncing ? (
              <div className='flex flex-col items-center gap-4 animate-in fade-in duration-700'>
                <Loader2 className='w-8 h-8 text-accent-primary animate-spin' />
                <div className='space-y-1'>
                  <p className='text-[15px] text-text-primary font-bold'>
                    Syncing Archive
                  </p>
                  <p className='text-[12px] text-text-tertiary leading-relaxed px-4 text-center'>
                    Updating your library with the latest changes from your other devices.
                  </p>
                </div>
              </div>
            ) : (
              <div className='space-y-2 opacity-40'>
                <p className='text-[15px] text-text-tertiary font-medium font-bold'>
                  {searchQuery ? 'No matches found' : 'Your vault is empty'}
                </p>
                <p className='text-[11px] text-text-tertiary uppercase tracking-widest'>
                  {searchQuery ? 'Try a different query' : 'Create a note to start'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4'>
            {(() => {
              const grouped = filteredNotes.reduce((acc, note) => {
                const title = getGroupTitle(note)
                if (!acc[title]) acc[title] = []
                acc[title].push(note)
                return acc
              }, {})

              const groupOrder = [NOTES_LIST_GROUP.TODAY, NOTES_LIST_GROUP.YESTERDAY, NOTES_LIST_GROUP.L7DAYS, NOTES_LIST_GROUP.L30DAYS]
              const sortedGroups = Object.keys(grouped).sort((a, b) => {
                const idxA = groupOrder.indexOf(a)
                const idxB = groupOrder.indexOf(b)
                if (idxA !== -1 && idxB !== -1) return idxA - idxB
                if (idxA !== -1) return -1
                if (idxB !== -1) return 1
                return b.localeCompare(a)
              })

              return sortedGroups.map(group => (
                <div key={group} className='mb-6'>
                  <h3 className='px-6 py-2 text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em] opacity-80 sticky top-0 bg-bg-secondary/95 backdrop-blur-md z-10 shadow-sm'>
                    {group}
                  </h3>
                  <div className='mt-1'>
                    {grouped[group].map(renderNotesList)}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
