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
  Folder,
  Menu
} from 'lucide-react'

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
  theme,
  isCollapsed,
  onToggleCollapse
}) {
  const getFolderCount = (folderId) => {
    if (folderId === 'all') {
      return notes.length
    }
    return notes.filter((n) => n.value?.folder === folderId).length
  }

  return (
    <div className='flex flex-col h-full w-full bg-bg-primary border-r border-border-primary transition-all duration-300'>
      <div className='px-4 py-3 border-b border-border-primary bg-bg-primary flex items-center'>
        <button
          onClick={onToggleCollapse}
          className='p-1.5 rounded-md text-text-secondary transition-colors'
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <Menu className='w-5 h-5' />
        </button>
      </div>

      <div className='flex-1 overflow-y-auto py-3'>
        <div className='px-2'>
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
                      ? 'bg-[var(--bg-folder-selected)] text-accent-primary'
                      : 'bg-transparent text-text-secondary hover:bg-bg-tertiary'
                  }`}
                title={isCollapsed ? folder.name : ''}
              >
                <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'gap-0' : 'gap-3.5'}`}>
                  <Icon
                    className={`w-5 h-5 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-80'} flex-shrink-0`}
                  />
                  <span
                    className={`text-[14px] tracking-[-0.01em] whitespace-nowrap transition-all duration-300 ${
                      isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
                    } ${isSelected ? 'font-medium' : 'font-normal'}`}
                  >
                    {folder.name}
                  </span>
                </div>
                {count > 0 && (
                  <span
                    className={`text-[12px] font-medium px-1.5 py-0.5 rounded-md transition-colors duration-150 whitespace-nowrap
                      ${
                        isSelected
                          ? 'text-accent-primary bg-transparent'
                          : 'text-text-tertiary bg-transparent'
                      } ${isCollapsed ? 'hidden' : 'block'}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className={`px-2 py-4 space-y-2.5 border-t border-border-primary bg-bg-primary flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
        <button
          onClick={onCreateNote}
          className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 p-0 rounded-full' : 'w-full gap-2.5 px-4 py-3 rounded-xl'} text-[#1c1c1e] transition-all font-medium bg-accent-primary hover:bg-accent-primary-hover hover:scale-[1.02] active:scale-100`}
          title='New Note'
        >
          <Plus className='w-5 h-5 flex-shrink-0' strokeWidth={2.5} />
          <span className={`text-[14px] font-semibold whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>New Note</span>
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-10 h-10 p-0 rounded-full' : 'w-full gap-2.5 rounded-xl'}`}>
          <button
            onClick={onCreateFolder}
            className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 p-0 rounded-full' : 'w-full gap-2.5 px-4 py-3 rounded-xl'} bg-bg-tertiary text-text-secondary border border-border-primary hover:bg-bg-quaternary hover:scale-[1.02] hover:border-border-secondary active:scale-100`}
          >
            <FolderPlus className='w-4 h-4 flex-shrink-0' />
            <span className={`text-[14px] whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>New Folder</span>
          </button>
        </div>

        <div className={`flex ${isCollapsed ? 'flex-col gap-3' : 'gap-2 pt-2'}`}>
          <button
            onClick={onSettingsClick}
            className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 rounded-full' : 'flex-1 px-3 py-2.5 rounded-xl'} transition-all font-medium bg-bg-tertiary text-text-secondary border border-border-primary hover:bg-bg-quaternary hover:scale-[1.01] hover:border-border-secondary active:scale-100`}
            title='Settings'
          >
            <Settings className='w-4 h-4' />
          </button>
          <button
            onClick={onThemeToggle}
            className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 rounded-full' : 'flex-1 px-3 py-2.5 rounded-xl'} transition-all font-medium bg-bg-tertiary text-text-secondary border border-border-primary hover:bg-bg-quaternary hover:scale-[1.01] hover:border-border-secondary active:scale-100`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
          </button>
        </div>
      </div>
    </div>
  )
}
