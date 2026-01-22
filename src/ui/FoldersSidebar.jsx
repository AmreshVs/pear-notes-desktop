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
import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { updateFolder } from '../store/slices/foldersSlice'
import { getNoteCountsPerFolder } from '../store/slices/notesSlice'
import { DEFAULT_FOLDER_NAME } from '../constant'

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
  folders,
  onCreateNote,
  onCreateFolder,
  onSettingsClick,
  onThemeToggle,
  theme,
  isCollapsed,
  onToggleCollapse,
  onDeleteFolder
}) {
  const dispatch = useDispatch()
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef(null)
  const noteCounts = useSelector(getNoteCountsPerFolder)

  useEffect(() => {
    if (editingFolderId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingFolderId])

  const handleStartRename = (e, folder) => {
    e.stopPropagation()
    if (folder.isSystem) return
    setEditingFolderId(folder.id)
    setEditName(folder.name)
  }

  const handleSubmitRename = () => {
    if (editingFolderId && editName.trim()) {
      dispatch(updateFolder({ id: editingFolderId, name: editName.trim() }))
    }
    setEditingFolderId(null)
    setEditName('')
  }

  const getFolderCount = (folderId) => {
    return noteCounts[folderId] || 0
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmitRename()
    } else if (e.key === 'Escape') {
      setEditingFolderId(null)
      setEditName('')
    }
  }

  const renderFolder = (folder) => {
    const Icon = ICON_MAP[folder.icon] || Folder
    const isSelected = selectedFolder === folder.id
    const count = getFolderCount(folder.id)
    const isEditing = editingFolderId === folder.id

    return (
      <button
        key={folder.id}
        onClick={() => !isEditing && onSelectFolder(folder.id)}
        onDoubleClick={(e) => handleStartRename(e, folder)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1.5 transition-all duration-200 group relative overflow-hidden
          ${
            isSelected
              ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_15px_rgba(var(--accent-primary),0.05)]'
              : 'bg-transparent text-text-secondary hover:bg-bg-tertiary/50 border border-transparent'
          }`}
        title={isCollapsed ? folder.name : (isEditing ? '' : 'Double click to rename')}
      >
        <div className={`flex items-center transition-all duration-100 min-w-0 flex-1 ${isCollapsed ? 'gap-0' : 'gap-4'}`}>
          <Icon
            className={`w-5 h-5 transition-all duration-200 ${isSelected ? 'opacity-100 scale-110' : 'opacity-70 scale-100'} flex-shrink-0`}
          />
          
          {isEditing && !isCollapsed ? (
             <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSubmitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-text-primary p-0 m-0"
            />
          ) : (
            <span
              className={`text-[14px] tracking-tight whitespace-nowrap transition-opacity duration-100 truncate ${
                isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              } ${isSelected ? 'font-bold' : 'font-medium'}`}
            >
              {folder.name || DEFAULT_FOLDER_NAME}
            </span>
          )}
        </div>
        
        {!isEditing && (
          <div className='flex items-center gap-2 flex-shrink-0 ml-2'>
            {!isCollapsed && !folder.isSystem && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(`Are you sure you want to delete "${folder.name}"?`)) {
                    onDeleteFolder(folder.id)
                  }
                }}
                className='opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-accent-danger/10 transition-all text-text-tertiary hover:text-accent-danger'
                title='Delete Folder'
              >
                <Trash2 className='w-3.5 h-3.5' />
              </button>
            )}
            {count > 0 && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors duration-150 whitespace-nowrap
                  ${
                    isSelected
                      ? 'text-accent-primary bg-accent-primary/10'
                      : 'text-text-muted bg-bg-tertiary/50'
                  } ${isCollapsed ? 'hidden' : 'block'}`}
              >
                {count}
              </span>
            )}
          </div>
        )}
      </button>
    )
  }

  const topFolders = folders.filter((f) => !f.isTrash)
  const bottomFolders = folders.filter((f) => f.isTrash)

  return (
    <div className='flex flex-col h-full w-full bg-bg-primary/80 backdrop-blur-xl border-r border-border-primary transition-all duration-300 relative'>
      <div className='px-5 py-4 border-b border-border-primary/50 flex items-center'>
        <button
          onClick={onToggleCollapse}
          className='p-2 rounded-xl text-text-secondary hover:bg-bg-tertiary transition-all active:scale-95'
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <Menu className='w-5 h-5' />
        </button>
      </div>

      <div className='flex-1 overflow-y-auto pt-4 pb-2 px-3 flex flex-col justify-between scrollbar-hide'>
        <div>
          {topFolders.map(renderFolder)}
        </div>
        <div className='mt-auto pt-6'>
          <div className={`text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3 px-4 transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            Library
          </div>
          {bottomFolders.map(renderFolder)}
        </div>
      </div>

      <div className={`px-3 py-5 space-y-3 border-t border-border-primary bg-bg-primary/50 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
        <button
          onClick={onCreateNote}
          className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 p-0 rounded-xl' : 'w-full gap-3 px-4 py-3.5 rounded-2xl'} shadow-glow-primary text-[#1c1c1e] transition-all font-bold bg-accent-primary hover:bg-accent-primary-hover hover:scale-[1.02] active:scale-95`}
          title='New Note'
        >
          <Plus className='w-5 h-5 flex-shrink-0' strokeWidth={3} />
          {!isCollapsed && <span className='text-[15px] whitespace-nowrap animate-in fade-in duration-200'>New Note</span>}
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-10 h-10 p-0 rounded-xl' : 'w-full gap-3 rounded-2xl'}`}>
          <button
            onClick={onCreateFolder}
            className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 p-0 rounded-xl' : 'w-full gap-3 px-4 py-3.5 rounded-2xl'} bg-bg-tertiary/40 text-text-secondary border border-border-primary/50 hover:bg-bg-tertiary hover:scale-[1.02] hover:border-border-secondary active:scale-95 transition-all`}
            title='New Folder'
          >
            <FolderPlus className='w-4 h-4 flex-shrink-0' />
            {!isCollapsed && <span className='text-[14px] font-medium whitespace-nowrap animate-in fade-in duration-200'>New Folder</span>}
          </button>
        </div>

        <div className={`flex ${isCollapsed ? 'flex-col gap-3' : 'gap-3 pt-2'}`}>
          <button
            onClick={onSettingsClick}
            className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 rounded-xl' : 'flex-1 px-3 py-3 rounded-2xl'} transition-all font-medium bg-bg-tertiary/40 text-text-secondary border border-border-primary/50 hover:bg-bg-tertiary hover:border-border-secondary active:scale-95`}
            title='Settings'
          >
            <Settings className='w-4 h-4' />
          </button>
          <button
            onClick={onThemeToggle}
            className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 rounded-xl' : 'flex-1 px-3 py-3 rounded-2xl'} transition-all font-medium bg-bg-tertiary/40 text-text-secondary border border-border-primary/50 hover:bg-bg-tertiary hover:border-border-secondary active:scale-95`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
          </button>
        </div>
      </div>
    </div>
  )
}
