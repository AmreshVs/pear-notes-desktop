import { Trash2 } from 'lucide-react'

export default function NotesList({
  notes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  selectedFolder
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

  const getPreview = (content, contentHtml) => {
    if (!content && !contentHtml) return 'No additional text'

    // Extract plain text from HTML if available
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

  // Notes are already filtered in App.jsx, so we use them directly
  const folderNames = {
    all: 'All Notes',
    work: 'Work',
    personal: 'Personal',
    ideas: 'Ideas',
    trash: 'Recently Deleted'
  }

  return (
    <div
      className='flex flex-col h-full w-full'
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header - Premium Styling */}
      <div
        className='px-5 py-4'
        style={{
          borderBottom: '1px solid var(--border-primary)',
          background: 'linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary))'
        }}
      >
        <div className='flex items-center justify-between mb-2'>
          <h2
            className='font-semibold text-[18px]'
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              fontWeight: '600'
            }}
          >
            {folderNames[selectedFolder] || 'All Notes'}
          </h2>
          <button
            className='text-[13px] px-2 py-1 rounded-md transition-all'
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Sort by
          </button>
        </div>
        <p
          className='text-[13px] font-medium'
          style={{ color: 'var(--text-tertiary)', opacity: 0.8 }}
        >
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </p>
      </div>

      {/* Notes List */}
      <div className='flex-1 overflow-y-auto'>
        {notes.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-[15px]' style={{ color: 'var(--text-tertiary)' }}>
              No notes yet
            </p>
          </div>
        ) : (
          <div>
            {notes.map((note) => {
              const isSelected = selectedNote?.key === note.key
              return (
                <div
                  key={note.key}
                  onClick={() => onSelectNote(note)}
                  className='px-5 py-3.5 cursor-pointer transition-all group'
                  style={{
                    borderBottom: '1px solid var(--border-primary)',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                    transform: isSelected ? 'translateX(2px)' : 'translateX(0)',
                    boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                      e.currentTarget.style.transform = 'translateX(2px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }
                  }}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      <h3
                        className='font-semibold text-[15px] mb-1.5 truncate'
                        style={{
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.01em',
                          fontWeight: isSelected ? '600' : '500'
                        }}
                      >
                        {note.value?.title || 'Untitled'}
                      </h3>
                      <p
                        className='text-[13px] line-clamp-2 mb-1.5 leading-relaxed'
                        style={{
                          color: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-tertiary)',
                          opacity: isSelected ? 1 : 1
                        }}
                      >
                        {getPreview(note.value?.content, note.value?.contentHtml)}
                      </p>
                      <p
                        className='text-[11px] font-medium'
                        style={{
                          color: isSelected ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-tertiary)',
                          opacity: 1
                        }}
                      >
                        {formatDate(note.value?.updatedAt || note.value?.createdAt)}
                      </p>
                    </div>
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteNote(note.key)
                        }}
                        className='opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 transition-all'
                        title='Delete Note'
                      >
                        <Trash2 className='w-4 h-4 text-red-400' />
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
