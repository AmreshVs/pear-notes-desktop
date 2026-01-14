import { Trash2, Search } from 'lucide-react'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteNote, getNoteData, getNoteKeys, getSelectedNote, setSelectedNote } from '../store/slices/notesSlice'
import { getFolders, getSelectedFolder } from '../store/slices/foldersSlice'
import { ALL_NOTES_KEY } from '../constant'

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
    const div = document.createElement('div')
    div.innerHTML = contentHtml
    text = div.textContent || div.innerText || ''
  } else {
    text = content || ''
  }

  text = text.replace(/\n/g, ' ').trim()
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
    dispatch(deleteNote(key))
  }, [dispatch])

  if (noteData?.folderKey !== selectedFolder && selectedFolder !== ALL_NOTES_KEY) return null

  return (
    <div
      key={key}
      onClick={() => handleSelectNote(key)}
      className={`px-3 py-3 cursor-pointer transition-all ease-smooth duration-200 group border-b border-border-primary
        ${
          isSelected
            ? 'bg-accent-primary'
            : 'bg-transparent hover:bg-bg-tertiary'
        }`}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1 min-w-0'>
          <h3
            className={`text-[15px] truncate tracking-[-0.01em]
              ${isSelected ? 'text-white font-bold' : 'text-text-primary font-bold'}`}
          >
            {noteData?.title || 'Untitled'}
          </h3>
          <p
            className={`text-[13px] line-clamp-2 leading-relaxed
              ${isSelected ? 'text-white/90' : 'text-text-tertiary'}`}
          >
            {getPreview(noteData?.note, noteData?.note)}
          </p>
          <p
            className={`text-[11px] font-medium
              ${isSelected ? 'text-white/80' : 'text-text-tertiary'}`}
          >
            {formatDate(noteData?.updatedAt || noteData?.createdAt)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteNote(key)
          }}
          className='opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-black/10 transition-all'
          title='Delete Note'
        >
          <Trash2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-text-primary'}`} />
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
  const notesKeys = useSelector(getNoteKeys)
  const folders = useSelector(getFolders)
  const currentFolderName = folders.find(f => f.id === selectedFolder)?.name || 'All Notes'

  const renderNotesList = useCallback((key) => {
    return (
      <NotesItem noteKey={key} />
    )
  }, [])

  return (
    <div className='flex flex-col h-full w-full bg-bg-secondary border-r border-border-primary'>
      <div className='px-4 py-3 border-b border-border-primary bg-bg-secondary'>
        <div className='flex items-center justify-between mb-1'>
          <h2 className='font-bold text-[18px] text-text-primary tracking-tight'>
            {currentFolderName}
          </h2>
          <button
            className='text-[12px] font-medium text-text-tertiary hover:text-text-primary transition-colors'
          >
            Sort by
          </button>
        </div>
        <p className='text-[12px] text-text-tertiary mb-3'>
          {notesKeys.length} {notesKeys.length === 1 ? 'note' : 'notes'}
        </p>
        
        <div className='relative group'>
          <Search className='absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary group-focus-within:text-accent-primary transition-colors' />
          <input
            type='text'
            placeholder='Search notes'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-8 pr-3 py-1.5 rounded-md text-[13px] focus:outline-none bg-bg-tertiary text-text-primary placeholder-text-tertiary border border-transparent focus:border-border-secondary transition-all shadow-sm'
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {notesKeys.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-[15px] text-text-tertiary'>
              No notes yet
            </p>
          </div>
        ) : (
          <div>{notesKeys.map(renderNotesList)}</div>
        )}
      </div>
    </div>
  )
}
