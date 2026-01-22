import { Trash2, Search, Loader2 } from 'lucide-react'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteNote, getNoteData, getFilteredNotes, getSelectedNote, setSelectedNote } from '../store/slices/notesSlice'
import { getFolders, getSelectedFolder } from '../store/slices/foldersSlice'
import { getInviterStatus } from '../store/slices/syncSlice'
import { RECENTLY_DELETED_KEY } from '../constant'

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`
    }
    return `${hours}h ago`
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return `${days}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

const getPreview = (content, contentHtml) => {
  if (!content && !contentHtml) return 'No additional text'

  let text = ''
  if (contentHtml) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(contentHtml, 'text/html')
    text = doc.body.textContent || doc.body.innerText || ''
  } else {
    text = content || ''
  }
  
  if (text) text = text.replace(/\n/g, ' ').trim()
  return text.length > 60 ? text.substring(0, 60) + '...' : text
}

const NotesItem = ({ noteKey: key }) => {
  const dispatch = useDispatch()
  const noteData = useSelector(getNoteData(key))
  const selectedNote = useSelector(getSelectedNote)
  const selectedFolder = useSelector(getSelectedFolder)
  const isSelected = selectedNote === key

  const handleSelectNote = useCallback((key) => {
    dispatch(setSelectedNote(key))
  }, [dispatch])

  const handleDeleteNote = useCallback(async (key) => {
    if (selectedFolder === RECENTLY_DELETED_KEY) {
      if (window.confirm('Are you sure you want to permanently delete this note?')) {
        dispatch(deleteNote(key))
      }
    } else {
      dispatch(deleteNote(key))
    }
  }, [dispatch, selectedFolder])

  return (
    <div
      key={key}
      onClick={() => handleSelectNote(key)}
      className={`relative px-6 py-5 cursor-pointer transition-all duration-300 group border-b border-white/[0.03]
        ${
          isSelected
            ? 'bg-accent-primary/5 shadow-inner'
            : 'bg-transparent hover:bg-white/[0.02]'
        }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex-1 min-w-0'>
          <h3
            className={`text-[15px] truncate tracking-tight mb-1
              ${isSelected ? 'text-accent-primary font-bold' : 'text-text-primary font-bold transition-colors group-hover:text-accent-primary/80'}`}
          >
            {noteData?.title || 'Untitled'}
          </h3>
          <p
            className={`text-[12px] line-clamp-2 leading-relaxed mb-2 opacity-80
              ${isSelected ? 'text-text-primary/90' : 'text-text-tertiary'}`}
          >
            {getPreview(noteData?.note, noteData?.note)}
          </p>
          <div className='flex items-center gap-2'>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md
                ${isSelected ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-tertiary/50 text-text-muted'}`}
            >
              {formatDate(noteData?.updatedAt || noteData?.createdAt)}
            </span>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteNote(key)
          }}
          className='opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-accent-danger/10 transition-all text-text-muted hover:text-accent-danger active:scale-90 scale-90 group-hover:scale-100'
          title='Delete Note'
        >
          <Trash2 className='w-4 h-4' />
        </button>
      </div>
    </div>
  )
}

export default function NotesList({
  selectedFolder,
  searchQuery,
  onSearchChange
}) {
  const filteredNotes = useSelector(getFilteredNotes)
  const folders = useSelector(getFolders)
  const { step } = useSelector(getInviterStatus)
  const syncing = step === 'syncing'
  const currentFolderName = folders.find(f => f.id === selectedFolder)?.name || 'All Notes'

  const renderNotesList = useCallback((note) => {
    return (
      <NotesItem key={note.key} noteKey={note.key} />
    )
  }, [])

  return (
    <div className='flex flex-col h-full w-full bg-bg-secondary/40 backdrop-blur-xl border-r border-border-primary/50'>
      <div className='px-6 py-5 border-b border-border-primary/30'>
        <div className='flex items-center justify-between mb-2'>
          <h2 className='font-bold text-[22px] text-text-primary tracking-tight'>
            {currentFolderName}
          </h2>
          <div className='flex items-center gap-1.5 px-2 py-1 bg-bg-tertiary/50 rounded-lg border border-border-primary/50 text-[11px] font-bold text-text-tertiary hover:text-text-primary transition-all cursor-pointer'>
            <span>Sort</span>
            <div className='w-1 h-1 bg-text-muted rounded-full' />
            <span className='text-accent-primary'>Date</span>
          </div>
        </div>
        <p className='text-[12px] font-medium text-text-tertiary mb-5 ml-0.5 opacity-60 uppercase tracking-widest'>
          {filteredNotes.length} {filteredNotes.length === 1 ? 'recorded item' : 'recorded items'}
        </p>
        
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
                  <p className='text-[12px] text-text-tertiary leading-relaxed px-4'>
                    Updating your library with the latest changes from your other devices.
                  </p>
                </div>
              </div>
            ) : (
              <div className='space-y-2 opacity-40'>
                <p className='text-[15px] text-text-tertiary font-medium'>
                  {searchQuery ? 'No matches found' : 'Your vault is empty'}
                </p>
                <p className='text-[11px] text-text-tertiary uppercase tracking-widest'>
                  {searchQuery ? 'Try a different query' : 'Create a note to start'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className='animate-in fade-in slide-in-from-bottom-4 duration-500'>
            {filteredNotes.map(renderNotesList)}
          </div>
        )}
      </div>
    </div>
  )
}
