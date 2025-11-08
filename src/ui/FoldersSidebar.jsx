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
    <div className='flex flex-col h-full w-56' style={{ backgroundColor: 'var(--bg-primary)', borderRight: '1px solid var(--border-primary)' }}>
      {/* User Info */}
      <div className='px-4 py-3' style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <h2 className='font-semibold text-[15px]' style={{ color: 'var(--text-primary)' }}>Pear Notes</h2>
        <p className='text-[13px] mt-0.5' style={{ color: 'var(--text-tertiary)' }}>User</p>
      </div>

      {/* Folders List */}
      <div className='flex-1 overflow-y-auto py-2'>
        <div className='px-2'>
          <p className='text-[11px] font-medium uppercase tracking-wider px-3 py-2' style={{ color: 'var(--text-tertiary)' }}>
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md mb-1 transition-colors ${
                  isSelected
                    ? 'text-white'
                    : ''
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div className='flex items-center gap-3'>
                  <Icon className='w-4 h-4' />
                  <span className='text-[14px]'>{folder.name}</span>
                </div>
                {count > 0 && (
                  <span
                    className='text-[12px]'
                    style={{
                      color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-tertiary)'
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

      {/* Action Buttons */}
      <div className='px-4 py-3 space-y-2' style={{ borderTop: '1px solid var(--border-primary)' }}>
        <button
          onClick={onCreateNote}
          className='w-full flex items-center justify-center gap-2 px-3 py-2.5 text-white rounded-md transition-colors font-medium'
          style={{ backgroundColor: 'var(--accent-primary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary)'
          }}
        >
          <Plus className='w-4 h-4' />
          <span className='text-[14px]'>New Note</span>
        </button>
        <button
          className='w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors'
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-quaternary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
        >
          <FolderPlus className='w-4 h-4' />
          <span className='text-[14px]'>New Folder</span>
        </button>
      </div>
    </div>
  )
}

