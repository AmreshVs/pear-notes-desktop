import { Search, Plus, Trash2 } from 'lucide-react'

export default function Sidebar({
  notes,
  selectedNote,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  searchQuery,
  onSearchChange
}) {
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

  const getPreview = (content) => {
    if (!content) return 'No additional text'
    const text = content.replace(/\n/g, ' ').trim()
    return text.length > 80 ? text.substring(0, 80) + '...' : text
  }

  const filteredNotes = notes.filter((note) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const title = (note.value?.title || '').toLowerCase()
    const content = (note.value?.content || '').toLowerCase()
    return title.includes(query) || content.includes(query)
  })

  return (
    <div className='sidebar flex flex-col h-full bg-[#f5f5f7] dark:bg-[#1d1d1f] border-r border-[#e5e5e7] dark:border-[#2d2d2f]'>
      <div className='px-3 pt-4 pb-3 border-b border-[#e5e5e7] dark:border-[#2d2d2f]'>
        <div className='flex items-center justify-between'>
          <h1 className='text-[17px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight'>
            Notes
          </h1>
          <button
            onClick={onCreateNote}
            className='p-1.5 rounded-md hover:bg-[#e5e5e7] dark:hover:bg-[#2d2d2f] active:bg-[#d1d1d6] dark:active:bg-[#3d3d3f] transition-colors'
            title='New Note'
          >
            <Plus className='w-5 h-5 text-[#1d1d1f] dark:text-[#f5f5f7]' />
          </button>
        </div>

        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#86868b] dark:text-[#86868b]' />
          <input
            type='text'
            placeholder='Search'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#2d2d2f] border border-[#d1d1d6] dark:border-[#3d3d3f] rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 dark:text-[#f5f5f7] placeholder-[#86868b] dark:placeholder-[#86868b]'
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto'>
        {filteredNotes.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-[15px] text-[#86868b] dark:text-[#86868b]'>
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateNote}
                className='mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
              >
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredNotes.map((note) => {
              const isSelected = selectedNote?.key === note.key
              return (
                <div
                  key={note.key}
                  onClick={() => onSelectNote(note)}
                  className={`px-3 py-2.5 cursor-pointer border-b border-[#e5e5e7] dark:border-[#2d2d2f] transition-colors group ${
                    isSelected
                      ? 'bg-white dark:bg-[#2d2d2f]'
                      : 'hover:bg-[#ebebed] dark:hover:bg-[#2d2d2f] active:bg-[#e5e5e7] dark:active:bg-[#3d3d3f]'
                  }`}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      <h3
                        className={`font-medium text-[15px] mb-0.5 truncate ${
                          isSelected
                            ? 'text-[#1d1d1f] dark:text-[#f5f5f7]'
                            : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
                        }`}
                      >
                        {note.value?.title || 'Untitled'}
                      </h3>
                      <p className='text-[13px] text-[#86868b] dark:text-[#86868b] line-clamp-2 mb-1 leading-snug'>
                        {getPreview(note.value?.content)}
                      </p>
                      <p className='text-[11px] text-[#86868b] dark:text-[#86868b]'>
                        {formatDate(note.value?.updatedAt || note.value?.createdAt)}
                      </p>
                    </div>
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteNote(note.key)
                        }}
                        className='opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all'
                        title='Delete Note'
                      >
                        <Trash2 className='w-4 h-4 text-red-600 dark:text-red-400' />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
