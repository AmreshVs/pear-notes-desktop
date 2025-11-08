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

  // Filter notes by folder
  const filteredNotes = notes.filter((note) => {
    if (selectedFolder === 'all') return true
    if (selectedFolder === 'trash') return note.value?.folder === 'trash'
    return note.value?.folder === selectedFolder
  })

  const folderNames = {
    all: 'All Notes',
    work: 'Work',
    personal: 'Personal',
    ideas: 'Ideas',
    trash: 'Recently Deleted'
  }

  return (
    <div className='flex flex-col h-full w-full' style={{ backgroundColor: 'var(--bg-primary)', borderRight: '1px solid var(--border-primary)' }}>
      {/* Header */}
      <div className='px-4 py-3' style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div className='flex items-center justify-between mb-1'>
          <h2 className='font-semibold text-[17px]' style={{ color: 'var(--text-primary)' }}>
            {folderNames[selectedFolder] || 'All Notes'}
          </h2>
          <button className='text-[13px] transition-colors' style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
          >
            Sort by
          </button>
        </div>
        <p className='text-[13px]' style={{ color: 'var(--text-tertiary)' }}>{filteredNotes.length} notes</p>
      </div>

      {/* Notes List */}
      <div className='flex-1 overflow-y-auto'>
        {filteredNotes.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-[#8e8e93] text-[15px]'>No notes yet</p>
          </div>
        ) : (
          <div>
            {filteredNotes.map((note) => {
              const isSelected = selectedNote?.key === note.key
              return (
                <div
                  key={note.key}
                  onClick={() => onSelectNote(note)}
                  className='px-4 py-3 cursor-pointer transition-colors group'
                  style={{
                    borderBottom: '1px solid var(--border-primary)',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      <h3
                        className='font-semibold text-[15px] mb-1 truncate'
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {note.value?.title || 'Untitled'}
                      </h3>
                      <p
                        className='text-[13px] line-clamp-2 mb-1 leading-snug'
                        style={{
                          color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-tertiary)'
                        }}
                      >
                        {getPreview(note.value?.content, note.value?.contentHtml)}
                      </p>
                      <p
                        className='text-[11px]'
                        style={{
                          color: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-tertiary)'
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

