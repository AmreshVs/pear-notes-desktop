import { FileText, Briefcase, User, Lightbulb, Trash2, FolderPlus, Plus } from 'lucide-react'

const FOLDERS = [
  { id: 'all', name: 'All Notes', icon: FileText, count: null },
  { id: 'work', name: 'Work', icon: Briefcase, count: null },
  { id: 'personal', name: 'Personal', icon: User, count: null },
  { id: 'ideas', name: 'Ideas', icon: Lightbulb, count: null },
  { id: 'trash', name: 'Recently Deleted', icon: Trash2, count: null }
]

export default function FoldersSidebar({ selectedFolder, onSelectFolder, notes, onCreateNote }) {
  // Calculate note counts for each folder
  const folderCounts = {
    all: notes.length,
    work: notes.filter(n => n.value?.folder === 'work').length,
    personal: notes.filter(n => n.value?.folder === 'personal').length,
    ideas: notes.filter(n => n.value?.folder === 'ideas').length,
    trash: notes.filter(n => n.value?.folder === 'trash').length
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
      {/* User Info - Premium Header */}
      <div
        className='px-5 py-4'
        style={{
          borderBottom: '1px solid var(--border-primary)',
          background: 'linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary))'
        }}
      >
        <h2
          className='font-semibold text-[16px] mb-0.5'
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            fontWeight: '600'
          }}
        >
          Pear Notes
        </h2>
        <p className='text-[13px]' style={{ color: 'var(--text-tertiary)' }}>
          User
        </p>
      </div>

      {/* Folders List - Premium Styling */}
      <div className='flex-1 overflow-y-auto py-3'>
        <div className='px-3'>
          <p
            className='text-[10px] font-semibold uppercase tracking-widest px-3 py-2.5 mb-1'
            style={{
              color: 'var(--text-tertiary)',
              letterSpacing: '0.1em',
              opacity: 0.7
            }}
          >
            FOLDERS
          </p>
          {FOLDERS.map((folder) => {
            const Icon = folder.icon
            const isSelected = selectedFolder === folder.id
            const count = folderCounts[folder.id] || 0

            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className='w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg mb-0.5 transition-all'
                style={{
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transform: isSelected ? 'translateX(2px)' : 'translateX(0)',
                  boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                  transition: 'var(--transition-smooth)'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
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
                <div className='flex items-center gap-3.5'>
                  <Icon
                    className='w-4 h-4'
                    style={{
                      opacity: isSelected ? 1 : 0.8,
                      transition: 'var(--transition-fast)'
                    }}
                  />
                  <span
                    className='text-[14px] font-medium'
                    style={{
                      fontWeight: isSelected ? '500' : '400',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {folder.name}
                  </span>
                </div>
                {count > 0 && (
                  <span
                    className='text-[12px] font-medium px-1.5 py-0.5 rounded-md'
                    style={{
                      color: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-tertiary)',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Action Buttons - Premium Styling */}
      <div
        className='px-4 py-4 space-y-2.5'
        style={{
          borderTop: '1px solid var(--border-primary)',
          background: 'linear-gradient(to top, var(--bg-secondary), var(--bg-primary))'
        }}
      >
        <button
          onClick={onCreateNote}
          className='w-full flex items-center justify-center gap-2.5 px-4 py-3 text-white rounded-xl transition-all font-medium shadow-lg'
          style={{
            backgroundColor: 'var(--accent-primary)',
            boxShadow: 'var(--shadow-md), var(--glow-primary)',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'
            e.currentTarget.style.transform = 'scale(1.02)'
            e.currentTarget.style.boxShadow = 'var(--shadow-lg), var(--glow-primary-strong)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md), var(--glow-primary)'
          }}
        >
          <Plus className='w-4 h-4' strokeWidth={2.5} />
          <span className='text-[14px] font-semibold'>New Note</span>
        </button>
        <button
          className='w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all font-medium'
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-primary)',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-quaternary)'
            e.currentTarget.style.transform = 'scale(1.01)'
            e.currentTarget.style.borderColor = 'var(--border-secondary)'
            e.currentTarget.style.boxShadow = 'var(--shadow-xs)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.borderColor = 'var(--border-primary)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <FolderPlus className='w-4 h-4' />
          <span className='text-[14px]'>New Folder</span>
        </button>
      </div>
    </div>
  )
}

