import { Search, Plus, Trash2 } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { formatRelativeDate } from '../utils/formatters'

function getPreview(content) {
  if (!content) return 'No additional text'
  const text = content.replace(/\n/g, ' ').trim()
  return text.length > 80 ? text.substring(0, 80) + '...' : text
}

export default function Sidebar({
  notes,
  selectedNote,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  searchQuery,
  onSearchChange
}) {
  const filteredNotes = useMemo(() => notes.filter((note) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const title = (note.value?.title || '').toLowerCase()
    const content = (note.value?.content || '').toLowerCase()
    return title.includes(query) || content.includes(query)
  }), [notes, searchQuery])

  const renderNote = useCallback((note) => {
    const isSelected = selectedNote?.key === note.key
    return (
      <div
        key={note.key}
        onClick={() => onSelectNote(note)}
        className={`px-3 py-2.5 cursor-pointer border-b border-border-primary transition-colors group ${
          isSelected
            ? 'bg-bg-secondary'
            : 'hover:bg-bg-tertiary active:bg-bg-tertiary'
        }`}
      >
        <div className='flex items-start justify-between gap-2'>
          <div className='flex-1 min-w-0'>
            <h3
              className={`font-medium text-[15px] mb-0.5 truncate text-text-primary`}
            >
              {note.value?.title || 'Untitled'}
            </h3>
            <p className='text-[13px] text-text-tertiary line-clamp-2 mb-1 leading-snug'>
              {getPreview(note.value?.content)}
            </p>
            <p className='text-[11px] text-text-tertiary'>
              {formatRelativeDate(note.value?.updatedAt || note.value?.createdAt)}
            </p>
          </div>
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteNote(note.key)
              }}
              className='opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-accent-danger/10 transition-all'
              title='Delete Note'
            >
              <Trash2 className='w-4 h-4 text-accent-danger' />
            </button>
          )}
        </div>
      </div>
    )
  }, [selectedNote, onSelectNote, onDeleteNote])

  return (
    <div className='sidebar flex flex-col h-full bg-bg-secondary border-r border-border-primary'>
      <div className='px-3 pt-4 pb-3 border-b border-border-primary'>
        <div className='flex items-center justify-between'>
          <h1 className='text-[17px] font-semibold text-text-primary tracking-tight'>
            Notes
          </h1>
          <button
            onClick={onCreateNote}
            className='p-1.5 rounded-md hover:bg-bg-tertiary active:bg-bg-tertiary transition-colors'
            title='New Note'
          >
            <Plus className='w-5 h-5 text-text-primary' />
          </button>
        </div>

        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary' />
          <input
            type='text'
            placeholder='Search'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-8 pr-3 py-1.5 bg-bg-tertiary border border-border-primary rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-accent-primary text-text-primary placeholder-text-tertiary'
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {filteredNotes.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-[15px] text-text-tertiary'>
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateNote}
                className='mt-4 px-4 py-2 text-sm font-medium text-accent-primary hover:text-accent-primary-hover'
              >
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredNotes.map(renderNote)}
          </div>
        )}
      </div>
    </div>
  )
}
