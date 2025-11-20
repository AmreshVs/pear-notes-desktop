import {
  FileText,
  Briefcase,
  User,
  Lightbulb,
  Trash2,
  FolderPlus,
  Plus,
  Settings,
  Moon,
  Sun,
  Folder
} from 'lucide-react'

// Icon mapping for folder icons
const ICON_MAP = {
  FileText,
  Briefcase,
  User,
  Lightbulb,
  Trash2,
  Folder
}

export default function FoldersSidebar({
  selectedFolder,
  onSelectFolder,
  notes,
  folders,
  onCreateNote,
  onCreateFolder,
  onSettingsClick,
  onThemeToggle,
  theme
}) {
  // Calculate note counts for each folder
  const getFolderCount = (folderId) => {
    if (folderId === 'all') {
      return notes.length
    }
    return notes.filter((n) => n.value?.folder === folderId).length
  }

  return (
    <div className='flex flex-col h-full w-full bg-bg-primary border-r border-border-primary shadow-sm'>
      {/* User Info - Premium Header */}
      <div className='px-5 py-4 border-b border-border-primary bg-gradient-to-b from-bg-secondary to-bg-primary'>
        <h2 className='font-semibold text-[16px] mb-0.5 text-text-primary tracking-[-0.01em]'>
          Pear Notes
        </h2>
        <p className='text-[13px] text-text-tertiary'>User</p>
      </div>

      {/* Folders List - Premium Styling */}
      <div className='flex-1 overflow-y-auto py-3'>
        <div className='px-3'>
          <p className='text-[10px] font-semibold uppercase tracking-widest px-3 py-2.5 mb-1 text-text-tertiary opacity-70'>
            FOLDERS
          </p>
          {folders.map((folder) => {
            const Icon = ICON_MAP[folder.icon] || Folder
            const isSelected = selectedFolder === folder.id
            const count = getFolderCount(folder.id)

            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg mb-0.5 transition-all ease-smooth duration-200 group
                  ${
                    isSelected
                      ? 'bg-accent-primary text-text-primary translate-x-[2px] shadow-xs'
                      : 'bg-transparent text-text-secondary hover:bg-bg-tertiary hover:translate-x-[2px]'
                  }`}
              >
                <div className='flex items-center gap-3.5'>
                  <Icon
                    className={`w-4 h-4 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-80'}`}
                  />
                  <span
                    className={`text-[14px] tracking-[-0.01em] ${isSelected ? 'font-medium' : 'font-normal'}`}
                  >
                    {folder.name}
                  </span>
                </div>
                {count > 0 && (
                  <span
                    className={`text-[12px] font-medium px-1.5 py-0.5 rounded-md transition-colors duration-150
                      ${
                        isSelected
                          ? 'text-white/90 bg-white/15'
                          : 'text-text-tertiary bg-transparent'
                      }`}
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
      <div className='px-4 py-4 space-y-2.5 border-t border-border-primary bg-gradient-to-t from-bg-secondary to-bg-primary'>
        <button
          onClick={onCreateNote}
          className='w-full flex items-center justify-center gap-2.5 px-4 py-3 text-white rounded-xl transition-all font-medium shadow-md shadow-glow-primary bg-accent-primary hover:bg-accent-primary-hover hover:scale-[1.02] hover:shadow-lg hover:shadow-glow-primary-strong active:scale-100 active:shadow-md'
        >
          <Plus className='w-4 h-4' strokeWidth={2.5} />
          <span className='text-[14px] font-semibold'>New Note</span>
        </button>
        <button
          onClick={onCreateFolder}
          className='w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all font-medium bg-bg-tertiary text-text-secondary border border-border-primary hover:bg-bg-quaternary hover:scale-[1.01] hover:border-border-secondary hover:shadow-xs active:scale-100 active:shadow-none'
        >
          <FolderPlus className='w-4 h-4' />
          <span className='text-[14px]'>New Folder</span>
        </button>

        {/* Settings and Theme Toggle */}
        <div className='flex gap-2 pt-2'>
          <button
            onClick={onSettingsClick}
            className='flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-medium bg-bg-tertiary text-text-secondary border border-border-primary hover:bg-bg-quaternary hover:scale-[1.01] hover:border-border-secondary hover:shadow-xs active:scale-100 active:shadow-none'
            title='Settings'
          >
            <Settings className='w-4 h-4' />
          </button>
          <button
            onClick={onThemeToggle}
            className='flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-medium bg-bg-tertiary text-text-secondary border border-border-primary hover:bg-bg-quaternary hover:scale-[1.01] hover:border-border-secondary hover:shadow-xs active:scale-100 active:shadow-none'
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
          </button>
        </div>
      </div>
    </div>
  )
}
