import { Search, Loader2, SquarePen, Folder, Lock, LockOpen, Pin } from 'lucide-react'
import { useCallback, useMemo, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteNote, getNoteData, getFilteredNotes, getSelectedNote, setSelectedNote, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getInviterStatus, setShowPairingInput } from '@pear-notes/core/store/slices/syncSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { getLocalPreferences } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { RECENTLY_DELETED_KEY, ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import { formatDate, getGroupTitle, getPreview, getFirstImage, NOTES_LIST_GROUP } from '@pear-notes/core/utils.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { isNoteUnlocked, useNoteLockVersion } from '../lib/noteLock'
import { toggleNoteLock } from '../lib/noteLockActions'
import { showContextMenu } from '../lib/contextMenu'
import { useNoteLockPassword } from '../lib/noteLockPasswordContext'

const NotesItem = memo(({ noteKey: key, onMenuAction, allFolders, selectedFolder, isLast }) => {
  const dispatch = useDispatch()
  const noteData = useSelector(getNoteData(key))
  const selectedNote = useSelector(getSelectedNote)
  
  useNoteLockVersion()
  const isMasked = noteData?.locked === true && !isNoteUnlocked(key)

  const rawImgSrc = useMemo(() => getFirstImage(noteData?.note), [noteData?.note])
  const resolvedImgSrc = useSelector(state => getHyperdriveAddress(state, rawImgSrc))
  const imgSrc = isMasked ? null : resolvedImgSrc

  const rawPreviewText = useMemo(() => getPreview(noteData?.note, noteData?.note), [noteData?.note])
  const previewText = isMasked ? 'Authenticate to view this note' : rawPreviewText

  const isSelected = selectedNote === key

  const availableMoveFolders = allFolders.filter(f =>
    !f.isTrash &&
    f.id !== ALL_NOTES_KEY &&
    f.id !== noteData?.folderKey
  )

  const handleSelectNote = useCallback((key) => {
    dispatch(setSelectedNote(key))
  }, [dispatch])

  const isTrash = selectedFolder === RECENTLY_DELETED_KEY

  const handleContextMenu = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const locked = noteData?.locked === true
    const pinned = noteData?.pinned === true
    const moveSubmenu = availableMoveFolders.length > 0
      ? availableMoveFolders.map(f => ({ id: `move:${f.id}`, label: f.name }))
      : [{ label: 'No other lists', enabled: false }]
    const result = await showContextMenu([
      ...(isTrash ? [] : [{ id: 'togglePin', label: pinned ? 'Unpin Note' : 'Pin Note' }, { type: 'separator' }]),
      { label: 'Move to', submenu: moveSubmenu },
      { type: 'separator' },
      { id: 'copy', label: 'Copy Note' },
      { id: 'toggleLock', label: locked ? 'Remove Lock' : 'Lock Note' },
      { type: 'separator' },
      { id: 'delete', label: 'Delete' }
    ])
    if (!result) return
    if (result.startsWith('move:')) onMenuAction('move', key, result.slice(5))
    else onMenuAction(result, key)
  }, [availableMoveFolders, noteData?.locked, noteData?.pinned, isTrash, onMenuAction, key])

  return (
    <div className="relative">
      <div
        key={key}
        onClick={() => handleSelectNote(key)}
        onContextMenu={handleContextMenu}
        className={`relative pl-6 pr-2 py-3 cursor-pointer transition-colors duration-0 group ${!isLast ? 'border-b border-overlay-subtle' : ''}
          ${
            isSelected
              ? 'bg-accent-primary/5 shadow-inner'
              : 'bg-transparent hover:bg-overlay-faint'
          }`}
      >
        <div className='flex items-stretch justify-between gap-3'>
          <div className='flex-1 min-w-0 flex flex-col justify-center'>
            <h3
              className={`text-[15px] tracking-tight mb-0.5 flex items-center gap-1.5
                ${isSelected ? 'text-accent-primary font-bold' : 'text-text-primary font-bold transition-colors group-hover:text-accent-primary/80'}`}
            >
              {noteData?.pinned && !isTrash && (
                <Pin className='w-3.5 h-3.5 text-accent-primary flex-shrink-0 fill-accent-primary' />
              )}
              {noteData?.locked && (
                isMasked
                  ? <Lock className='w-3.5 h-3.5 text-accent-primary flex-shrink-0' />
                  : <LockOpen className='w-3.5 h-3.5 text-accent-primary flex-shrink-0' />
              )}
              <span className='truncate'>
                {noteData?.title || 'Untitled'}
              </span>
            </h3>
            <p
              className={`text-[12px] line-clamp-2 leading-relaxed opacity-80
                ${isSelected ? 'text-text-primary' : 'text-text-primary/70'}`}
            >
              {previewText}
            </p>
            <div className='flex items-center gap-1.5 mt-2 opacity-50 text-[10px] font-bold uppercase tracking-wider'>
              {selectedFolder === ALL_NOTES_KEY && noteData?.folderKey && (
                <>
                  <div className='flex items-center gap-1.5'>
                    <Folder className='w-3 h-3' />
                    <span>
                      {allFolders.find(f => f.id === noteData.folderKey)?.name || 'Notes'}
                    </span>
                  </div>
                  <span>•</span>
                </>
              )}
              <span>
                {formatDate(noteData?.updatedAt || noteData?.createdAt)}
              </span>
            </div>
          </div>

          {imgSrc && (
            <div className="flex items-center gap-1 ml-2 flex-shrink-0 relative">
              <div className="relative flex-none h-[56px] w-[56px] rounded-lg overflow-hidden border border-white/10 shadow-sm bg-bg-tertiary/20 hardware-accelerated">
                <img
                  src={imgSrc}
                  alt="Note attachment"
                  className="w-full h-full object-cover"
                  decoding="async"
                />
              </div>
            </div>
          )}

    </div>
  </div>
</div>
  )
})

NotesItem.displayName = 'NotesItem'

export default function NotesList({
  selectedFolder,
  searchQuery,
  onSearchChange,
  onCreateNote,
  onToggleSidebar,
  isSidebarCollapsed
}) {
  const dispatch = useDispatch()
  const filteredNotes = useSelector(getFilteredNotes)
  const folders = useSelector(getFolders)
  const lockMethod = useSelector(getLockMethod)
  const { requestUnlockPassword, showLockUnavailable } = useNoteLockPassword()
  const { step } = useSelector(getInviterStatus)
  const localPreferences = useSelector(getLocalPreferences)
  const isSynced = localPreferences['isSynced'] === 'true'
  const syncing = step === 'syncing'
  const currentFolderName = folders.find(f => f.id === selectedFolder)?.name || 'All Notes'

  const handleLinkDevice = useCallback(() => {
    dispatch(setShowPairingInput(true))
  }, [dispatch])

  const groupOrder = useMemo(() => [NOTES_LIST_GROUP.PINNED, NOTES_LIST_GROUP.TODAY, NOTES_LIST_GROUP.YESTERDAY, NOTES_LIST_GROUP.L7DAYS, NOTES_LIST_GROUP.L30DAYS], [])

  const isTrash = selectedFolder === RECENTLY_DELETED_KEY

  const groupedNotes = useMemo(() => {
    return filteredNotes.reduce((acc, note) => {
      const title = !isTrash && note.value?.pinned === true ? NOTES_LIST_GROUP.PINNED : getGroupTitle(note)
      if (!acc[title]) acc[title] = []
      acc[title].push(note)
      return acc
    }, {})
  }, [filteredNotes, isTrash])

  const sortedGroups = useMemo(() => {
    return Object.keys(groupedNotes).sort((a, b) => {
      const idxA = groupOrder.indexOf(a)
      const idxB = groupOrder.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return b.localeCompare(a)
    })
  }, [groupedNotes, groupOrder])

  const handleMenuAction = useCallback(async (action, noteKey, folderId) => {
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
      case 'toggleLock':
        await toggleNoteLock({
          key: noteKey,
          currentlyLocked: noteData?.value?.locked === true,
          dispatch,
          lockMethod,
          requestPassword: requestUnlockPassword,
          onUnavailable: showLockUnavailable
        })
        break
      case 'togglePin':
        dispatch(updateNote({
          key: noteKey,
          pinned: !(noteData?.value?.pinned === true)
        }))
        break
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
  }, [dispatch, filteredNotes, selectedFolder, lockMethod, requestUnlockPassword, showLockUnavailable])

  const renderNotesList = useCallback((note, index, array) => {
    const isLast = index === array.length - 1
    return (
      <NotesItem
        key={note.key}
        noteKey={note.key}
        onMenuAction={handleMenuAction}
        allFolders={folders}
        selectedFolder={selectedFolder}
        isLast={isLast}
      />
    )
  }, [folders, handleMenuAction, selectedFolder])

  return (
    <div className='flex flex-col h-full w-full bg-bg-secondary/95 backdrop-blur-xl border-r border-border-primary/50 relative overflow-hidden hardware-accelerated'>
      <div className='px-6 pt-10 pb-4 border-b border-border-primary/30 min-h-[140px] flex flex-col gap-4'>
        <div className='flex items-center justify-between h-[40px]'>
          <div className='flex items-center gap-4'>
            <button
              onClick={onToggleSidebar}
              className='p-2 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200'
              title='Toggle Sidebar'
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className='w-5 h-5'
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                {!isSidebarCollapsed && (
                  <path 
                    d="M5 3h4v18H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z" 
                    fill="currentColor" 
                    className="animate-in fade-in duration-300"
                  />
                )}
              </svg>
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
              className='p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200'
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
          <div className='flex-1 flex flex-col items-center justify-center -mt-10'>
            {syncing ? (
              <div className='flex flex-col items-center gap-4 animate-in fade-in duration-700'>
                <Loader2 className='w-8 h-8 text-accent-primary animate-spin' />
                <div className='space-y-1 text-center'>
                  <p className='text-[15px] text-text-primary font-bold'>
                    Syncing Library
                  </p>
                  <p className='text-[12px] text-text-tertiary leading-relaxed px-10'>
                    Fetching your notes and folders from your other devices...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {searchQuery ? (
                  <div className='w-full px-8 flex flex-col items-center justify-center gap-4 py-12'>
                    <div className='space-y-3 text-center'>
                      <p className='text-[17px] text-text-primary font-bold tracking-tight'>
                        No matches found
                      </p>
                      <p className='text-[13px] text-text-tertiary/80 font-medium'>
                        Try a different search term
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='w-full px-8 space-y-16'>
                    <div className='flex flex-col items-center gap-4'>
                      <div className='space-y-2.5 text-center'>
                        <p className='text-[13px] text-text-tertiary/60 font-bold uppercase tracking-[0.15em]'>
                          Create a note to start
                        </p>
                      </div>
                    </div>

                    {!isSynced && (
                      <div className='pt-4 space-y-5'>
                        <div className='text-center space-y-2'>
                          <p className='text-[13px] font-bold text-text-primary uppercase tracking-[0.15em]'>Link Existing Device</p>
                          <p className='text-[11px] text-text-tertiary/60 uppercase tracking-[0.12em]'>Already have notes elsewhere?</p>
                        </div>
                        
                        <button 
                          onClick={handleLinkDevice}
                          className='w-full py-4 bg-accent-primary text-white rounded-xl font-bold text-[15px] shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'
                        >
                          Connect Device
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4'>
            {sortedGroups.map(group => (
              <div key={group} className='mb-6'>
                <h3 className='px-6 py-2 text-[10px] font-bold text-text-primary uppercase tracking-[0.2em] sticky top-0 bg-bg-secondary/95 backdrop-blur-md z-10 border-b border-overlay-subtle transform-cpu hardware-accelerated'>
                  {group}
                </h3>
                <div>
                  {groupedNotes[group].map((note, index) => renderNotesList(note, index, groupedNotes[group]))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
