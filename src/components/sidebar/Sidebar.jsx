import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Trash2 } from 'lucide-react'

import { formatRelativeDate } from '../../utils/formatters'

function getPreview(content, t) {
  if (!content) return t('noteCard.noAdditionalText')
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
  const { t } = useTranslation()
  const filteredNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        const title = (note.value?.title || '').toLowerCase()
        const content = (note.value?.content || '').toLowerCase()
        return title.includes(query) || content.includes(query)
      }),
    [notes, searchQuery]
  )

  const renderNote = useCallback(
    (note) => {
      const isSelected = selectedNote?.key === note.key
      return (
        <div
          key={note.key}
          onClick={() => onSelectNote(note)}
          className={`px-3 py-2.5 cursor-pointer border-b border-border-primary transition-colors group ${
            isSelected ? 'bg-bg-secondary' : 'hover:bg-bg-tertiary active:bg-bg-tertiary'
          }`}
        >
          <div className='flex items-start justify-between gap-2'>
            <div className='flex-1 min-w-0'>
              <h3 className={`font-medium text-base mb-0.5 truncate text-text-primary`}>
                {note.value?.title || t('sidebar.untitled')}
              </h3>
              <p className='text-sm text-text-tertiary line-clamp-2 mb-1 leading-snug'>
                {getPreview(note.value?.content, t)}
              </p>
              <p className='text-xs text-text-tertiary'>
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
                title={t('sidebar.deleteNote')}
              >
                <Trash2 className='w-4 h-4 text-accent-danger' />
              </button>
            )}
          </div>
        </div>
      )
    },
    [selectedNote, onSelectNote, onDeleteNote, t]
  )

  return (
    <div className='sidebar flex flex-col h-full bg-bg-secondary border-r border-border-primary'>
      <div className='px-3 pt-4 pb-3 border-b border-border-primary'>
        <div className='flex items-center justify-between'>
          <h1 className='text-lg font-semibold text-text-primary tracking-tight'>
            {t('sidebar.title')}
          </h1>
          <button
            onClick={onCreateNote}
            className='p-1.5 rounded-md hover:bg-bg-tertiary active:bg-bg-tertiary transition-colors'
            title={t('sidebar.newNote')}
            aria-label={t('sidebar.newNote')}
          >
            <Plus className='w-5 h-5 text-text-primary' />
          </button>
        </div>

        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary' />
          <input
            type='text'
            placeholder={t('sidebar.search')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-8 pr-3 py-1.5 bg-bg-tertiary border border-border-primary rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary text-text-primary placeholder-text-tertiary'
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {filteredNotes.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-base text-text-tertiary'>
              {searchQuery ? t('sidebar.noNotesFound') : t('sidebar.noNotesYet')}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateNote}
                className='mt-4 px-4 py-2 text-sm font-medium text-accent-primary hover:text-accent-primary-hover'
              >
                {t('sidebar.createFirstNote')}
              </button>
            )}
          </div>
        ) : (
          <div>{filteredNotes.map(renderNote)}</div>
        )}
      </div>
    </div>
  )
}
