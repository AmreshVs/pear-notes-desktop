import {
  FileText,
  Briefcase,
  User,
  Lightbulb,
  Trash2,
  FolderPlus,
  Plus,
  Settings,
  Folder,
  Pencil,
  MoreVertical
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
  onDeleteFolder
}) {
  const dispatch = useDispatch()
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef(null)
  const noteCounts = useSelector(getNoteCountsPerFolder)
  
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRefs = useRef({})

  useEffect(() => {
    if (editingFolderId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingFolderId])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  const handleStartRename = (e, folder) => {
    e.stopPropagation()
    setOpenMenuId(null)
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

  const handleMenuAction = (action, folder) => {
    setOpenMenuId(null)
    
    switch (action) {
      case 'new-note':
        onSelectFolder(folder.id)
        onCreateNote()
        break
      case 'new-folder':
        onCreateFolder()
        break
      case 'rename':
        setEditingFolderId(folder.id)
        setEditName(folder.name)
        break
      case 'delete':
        if (window.confirm(`Are you sure you want to delete "${folder.name}"?`)) {
          onDeleteFolder(folder.id)
        }
        break
    }
  }

  const renderFolder = (folder) => {
    const Icon = ICON_MAP[folder.icon] || Folder
    const isSelected = selectedFolder === folder.id
    const count = getFolderCount(folder.id)
    const isEditing = editingFolderId === folder.id
    const isMenuOpen = openMenuId === folder.id

    return (
      <div key={folder.id} className="relative">
        <button
          onClick={() => !isEditing && onSelectFolder(folder.id)}
          onDoubleClick={(e) => handleStartRename(e, folder)}
          className={`flex items-center transition-all duration-300 group relative mb-4 w-full px-4 py-3 justify-between rounded-xl
            ${
              isSelected
                ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_4px_12px_rgba(var(--accent-primary),0.1)]'
                : 'bg-transparent text-text-secondary hover:bg-bg-tertiary border border-transparent'
            }`}
          title={isEditing ? '' : 'Double click to rename'}
        >
          <div className="flex items-center transition-all duration-200 gap-4 min-w-0">
            <Icon
              className={`transition-all duration-300 w-5 h-5 ${isSelected ? 'opacity-100 scale-110' : 'opacity-70 scale-100'} flex-shrink-0`}
            />
            
            {isEditing ? (
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
                className={`text-[14px] tracking-tight whitespace-nowrap truncate ${isSelected ? 'font-bold' : 'font-medium'}`}
              >
                {folder.name || DEFAULT_FOLDER_NAME}
              </span>
            )}
          </div>
          
          {!isEditing && (
            <div className='flex items-center gap-2 flex-shrink-0 ml-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(isMenuOpen ? null : folder.id)
                }}
                className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-bg-tertiary/60 transition-all ${isMenuOpen ? 'opacity-100 bg-bg-tertiary/60' : ''}`}
                title='Options'
              >
                <MoreVertical className='w-3.5 h-3.5' />
              </button>
              {count > 0 && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors duration-150 whitespace-nowrap
                    ${
                      isSelected
                        ? 'text-accent-primary bg-accent-primary/20'
                        : 'text-text-muted bg-bg-tertiary/50'
                    }`}
                >
                  {count}
                </span>
              )}
            </div>
          )}
        </button>

        {isMenuOpen && (
          <div
            ref={(el) => menuRefs.current[folder.id] = el}
            className="absolute right-2 top-12 z-50 w-52 bg-bg-panel border border-white/[0.05] rounded-[1.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-2 animate-in zoom-in-95 fade-in duration-200 origin-top-right"
          >
            <div className="relative z-10">
              <button
                onClick={() => handleMenuAction('new-note', folder)}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-primary hover:bg-accent-primary/10 rounded-xl transition-all text-left group/item"
              >
                <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover/item:bg-accent-primary/20 transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="font-bold tracking-tight">New Note</span>
              </button>
              
              <button
                onClick={() => handleMenuAction('new-folder', folder)}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-primary hover:bg-accent-primary/10 rounded-xl transition-all text-left group/item"
              >
                <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover/item:bg-accent-primary/20 transition-colors">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <span className="font-bold tracking-tight">New Folder</span>
              </button>

              {!folder.isSystem && (
                <>
                  <div className="h-px bg-white/[0.05] my-1 mx-2" />
                  <button
                    onClick={() => handleMenuAction('rename', folder)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-primary hover:bg-accent-primary/10 rounded-xl transition-all text-left group/item"
                  >
                    <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover/item:bg-accent-primary/20 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </div>
                    <span className="font-bold tracking-tight">Rename</span>
                  </button>
                  <div className="h-px bg-white/[0.05] my-1 mx-2" />
                  <button
                    onClick={() => handleMenuAction('delete', folder)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-accent-danger/90 hover:bg-accent-danger/10 rounded-xl transition-all text-left group/item"
                  >
                    <div className="w-7 h-7 rounded-lg bg-bg-tertiary/50 flex items-center justify-center text-accent-danger/70 group-hover/item:bg-accent-danger/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="font-black tracking-tight">Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const topFolders = folders.filter((f) => !f.isTrash)
  const bottomFolders = folders.filter((f) => f.isTrash)

  return (
    <div className='flex flex-col h-full w-full bg-bg-primary/80 backdrop-blur-xl border-r border-border-primary relative'>
      <div className="px-6 pt-10 pb-4 border-b border-border-primary/50 min-h-[110px] flex flex-col">
        <div className='flex items-center justify-between h-[40px]'>
          <h2 className="text-[20px] font-bold text-text-primary tracking-tight">Library</h2>
          <button
            onClick={onCreateFolder}
            className='p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-white/5 text-text-primary active:scale-95 transition-all duration-200'
            title='New Folder'
          >
            <FolderPlus className='w-5 h-5' />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 pb-2 flex flex-col justify-between scrollbar-hide px-3">
        <div>
          {topFolders.map(renderFolder)}
        </div>
        <div className='mt-auto pt-6 flex flex-col'>
          <div className='text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-3 px-4'>
            Archive
          </div>
          <div>
            {bottomFolders.map(renderFolder)}
          </div>
        </div>
      </div>

      <div className="py-6 border-t border-border-primary bg-bg-primary/30 flex flex-col items-center px-3 space-y-3">
        <div className="w-full pt-2">
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center transition-all font-medium bg-bg-tertiary/40 text-text-secondary border border-border-primary/50 hover:bg-bg-tertiary hover:border-border-secondary active:scale-95 w-full gap-3 px-3 py-3 rounded-2xl"
            title='Settings'
          >
            <Settings className="w-4 h-4 flex-shrink-0 transition-all" />
            <span className='text-[14px] font-medium whitespace-nowrap'>Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
