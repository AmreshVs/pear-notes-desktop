import { Trash2 } from 'lucide-react'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteNote, getNoteData, getNoteKeys, getSelectedNote, setSelectedNote } from '../store/slices/notesSlice'

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

const folderNames = {
  all: 'All Notes',
  work: 'Work',
  personal: 'Personal',
  ideas: 'Ideas',
  trash: 'Recently Deleted'
}

const NotesItem = ({ noteKey: key }) => {
  const dispatch = useDispatch()
  const noteData = useSelector(getNoteData(key))
  const selectedNote = useSelector(getSelectedNote)
  const isSelected = selectedNote === key

  const handleSelectNote = useCallback((key) => {
    dispatch(setSelectedNote(key))
  }, [dispatch])

  const handleDeleteNote = useCallback(async (key) => {
    dispatch(deleteNote(key))
  }, [dispatch])

  return (
    <div
      key={key}
      onClick={() => handleSelectNote(key)}
      className={`px-5 py-3.5 cursor-pointer transition-all ease-smooth duration-200 group border-b border-border-primary
        ${
          isSelected
            ? 'bg-accent-primary translate-x-[2px]'
            : 'bg-transparent hover:bg-bg-tertiary hover:translate-x-[2px]'
        }`}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex-1 min-w-0'>
          <h3
            className={`text-[15px] mb-1.5 truncate tracking-[-0.01em]
              ${isSelected ? 'text-white font-bold' : 'text-text-primary font-bold'}`}
          >
            {noteData?.title || 'Untitled'}
          </h3>
          <p
            className={`text-[13px] line-clamp-2 mb-1.5 leading-relaxed
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
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteNote(key)
            }}
            className='opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-black/10 transition-all'
            title='Delete Note'
          >
            <Trash2 className='w-4 h-4 text-white' />
          </button>
        )}
      </div>
    </div>
  )
}

export default function NotesList({
  selectedFolder
}) {
  const notesKeys = useSelector(getNoteKeys)

  const renderNotesList = useCallback((key) => {
    return (
      <NotesItem noteKey={key} />
    )
  }, [])

  return (
    <div className='flex flex-col h-full w-full bg-bg-secondary border-r border-border-primary'>
      <div className='px-5 py-4 border-b border-border-primary bg-bg-secondary'>
        <div className='flex items-center justify-between mb-2'>
          <h2 className='font-semibold text-[18px] text-text-primary tracking-[-0.02em]'>
            {folderNames[selectedFolder] || 'All Notes'}
          </h2>
          <button
            className='text-[13px] px-2 py-1 rounded-md transition-all text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
          >
            Sort by
          </button>
        </div>
        <p className='text-[13px] font-medium text-text-tertiary opacity-80'>
          {notesKeys.length} {notesKeys.length === 1 ? 'note' : 'notes'}
        </p>
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
