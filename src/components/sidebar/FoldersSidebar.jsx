import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  Briefcase,
  FileText,
  Folder,
  FolderPlus,
  Lightbulb,
  Settings,
  Trash2,
  User
} from 'lucide-react'

import {
  DEFAULT_FOLDER_NAME,
  FOLDER_ERROR,
  FOLDER_NAME_MAX_LENGTH
} from '@pear-notes/core/constant.js'
import { updateFolder } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getNoteCountsPerFolder } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getShouldAutoRenameNextFolder,
  setShouldAutoRenameNextFolder
} from '@pear-notes/core/store/slices/uiSlice.js'
import { findDuplicateFolder, validateFolderName } from '@pear-notes/core/utils.js'

import { showContextMenu } from '../../lib/contextMenu'

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
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [newFolderId, setNewFolderId] = useState(null)
  const [deletingFolderId, setDeletingFolderId] = useState(null)
  const shouldAutoRenameNextFolder = useSelector(getShouldAutoRenameNextFolder)
  const [editName, setEditName] = useState('')
  const [renameError, setRenameError] = useState(null)
  const inputRef = useRef(null)
  const noteCounts = useSelector(getNoteCountsPerFolder)
  const foldersRef = useRef(folders)

  useEffect(() => {
    if (shouldAutoRenameNextFolder) {
      const newFolder = folders.find((f) => !foldersRef.current.some((of) => of.id === f.id))
      if (newFolder) {
        setEditingFolderId(newFolder.id)
        setEditName(newFolder.name)
        onSelectFolder(newFolder.id)
        setNewFolderId(newFolder.id)
        dispatch(setShouldAutoRenameNextFolder(false))
        setTimeout(() => setNewFolderId(null), 1000)
      }
    }
    foldersRef.current = folders
  }, [folders, shouldAutoRenameNextFolder, dispatch, onSelectFolder])

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
    setRenameError(null)
  }

  const handleCancelRename = () => {
    setEditingFolderId(null)
    setEditName('')
    setRenameError(null)
  }

  const handleSubmitRename = () => {
    if (!editingFolderId) return handleCancelRename()
    const result = validateFolderName(folders, editName, editingFolderId)
    if (!result.valid) {
      setRenameError(
        result.error === FOLDER_ERROR.DUPLICATE_NAME
          ? t('folders.errors.duplicateName', { name: result.name })
          : t('folders.errors.emptyName')
      )
      return
    }
    dispatch(updateFolder({ id: editingFolderId, name: result.name }))
    handleCancelRename()
  }

  const handleChangeEditName = (e) => {
    setEditName(e.target.value)
    setRenameError(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancelRename()
      return
    }
    if (e.key === 'Enter') {
      handleSubmitRename()
    }
  }

  const nextAvailableFolderName = () => {
    const base = t('folders.untitled')
    if (!findDuplicateFolder(folders, base)) return base
    let suffix = 2
    while (findDuplicateFolder(folders, `${base} ${suffix}`)) suffix += 1
    return `${base} ${suffix}`
  }

  const handleCreateNewFolder = () => {
    dispatch(setShouldAutoRenameNextFolder(true))
    onCreateFolder(nextAvailableFolderName())
  }

  const handleMenuAction = (action, folder) => {
    switch (action) {
      case 'new-note':
        onSelectFolder(folder.id)
        onCreateNote()
        break
      case 'new-folder':
        handleCreateNewFolder()
        break
      case 'rename':
        setEditingFolderId(folder.id)
        setEditName(folder.name)
        break
      case 'delete':
        if (window.confirm(`${t('folders.deleteDescription')} "${folder.name}"?`)) {
          setDeletingFolderId(folder.id)
          setTimeout(() => {
            onDeleteFolder(folder.id)
          }, 200)
        }
        break
    }
  }

  const handleContextMenu = async (e, folder) => {
    e.preventDefault()
    e.stopPropagation()
    const items = [
      { id: 'new-note', label: t('folders.a11y.newNote') },
      { id: 'new-folder', label: t('folders.newFolder') }
    ]
    if (!folder.isSystem) {
      items.push(
        { type: 'separator' },
        { id: 'rename', label: t('folders.buttons.rename') },
        { id: 'delete', label: t('folders.buttons.delete') }
      )
    }
    const result = await showContextMenu(items)
    if (result) handleMenuAction(result, folder)
  }

  const topFolders = useMemo(() => folders.filter((f) => !f.isTrash), [folders])
  const bottomFolders = useMemo(() => folders.filter((f) => f.isTrash), [folders])

  const renderFolderItem = (folder) => {
    const Icon = ICON_MAP[folder.icon] || Folder
    const isSelected = selectedFolder === folder.id
    const count = noteCounts[folder.id] || 0
    const isEditing = editingFolderId === folder.id
    const isNew = newFolderId === folder.id
    const isDeleting = deletingFolderId === folder.id

    return (
      <div
        key={folder.id}
        className={`relative ${isNew ? '[animation:folder-entrance_200ms_var(--animation-timing-standard)]' : ''} ${isDeleting ? '[animation:folder-exit_200ms_var(--animation-timing-standard)]' : ''}`}
      >
        <button
          onClick={() => !isEditing && onSelectFolder(folder.id)}
          onDoubleClick={(e) => handleStartRename(e, folder)}
          onContextMenu={(e) => handleContextMenu(e, folder)}
          className={`flex items-center group relative mb-2 w-full px-4 py-3 justify-between rounded-xl transition-colors duration-0
            ${
              isSelected
                ? 'bg-[var(--accent-selected-bg)] text-accent-primary border border-[var(--accent-selected-border)] shadow-[0_4px_12px_rgba(var(--accent-primary),0.1)]'
                : 'bg-transparent text-text-secondary hover:bg-bg-tertiary border border-transparent'
            }`}
          title={isEditing ? '' : t('folders.doubleClickToRename')}
        >
          <div className='flex items-center gap-4 min-w-0 flex-1'>
            <Icon
              className={`w-5 h-5 transition-none duration-0 ${isSelected ? 'opacity-100 scale-110' : 'opacity-70 scale-100'} flex-shrink-0`}
            />
            <div className='flex-1 flex items-center h-5 overflow-hidden'>
              {isEditing ? (
                <input
                  ref={inputRef}
                  type='text'
                  value={editName}
                  onChange={handleChangeEditName}
                  onBlur={handleSubmitRename}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={FOLDER_NAME_MAX_LENGTH}
                  aria-label={t('folders.renameLabel')}
                  aria-invalid={!!renameError}
                  title={renameError || ''}
                  className={`w-full bg-bg-panel text-base text-text-primary tracking-tight leading-[20px] h-6 px-1.5 rounded-md border ${renameError ? 'border-red-500' : 'border-accent-primary'} ${isSelected ? 'font-bold' : 'font-medium'}`}
                />
              ) : (
                <span
                  className={`block text-base tracking-tight whitespace-nowrap truncate transition-none duration-0 leading-[20px] h-5 ${isSelected ? 'font-bold' : 'font-medium'}`}
                >
                  {folder.name || DEFAULT_FOLDER_NAME}
                </span>
              )}
            </div>
          </div>

          {count > 0 && (
            <div
              className={`flex items-center flex-shrink-0 ml-2 ${isEditing ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap transition-none duration-0 ${isSelected ? 'text-accent-primary bg-accent-primary/20' : 'text-text-secondary bg-bg-tertiary/50'}`}
              >
                {count}
              </span>
            </div>
          )}
        </button>
        {isEditing && renameError && (
          <div className='px-4 pb-2 -mt-1 text-xs font-medium text-red-500'>{renameError}</div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full w-full bg-bg-primary/80 backdrop-blur-xl border-r border-border-primary relative transition-none'>
      <div className='px-6 pt-10 pb-4 border-b border-border-primary/50 min-h-[110px] flex flex-col transition-none'>
        <div className='flex items-center justify-between h-[40px] transition-none'>
          <h2 className='text-title font-bold text-text-primary tracking-tight transition-none'>
            {t('folders.title')}
          </h2>
          <button
            onClick={handleCreateNewFolder}
            className='p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-0'
            title={t('folders.newFolder')}
            aria-label={t('folders.newFolder')}
          >
            <FolderPlus className='w-5 h-5 transition-none' />
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto pt-4 pb-2 flex flex-col justify-between scrollbar-hide px-3 transition-none'>
        <div className='transition-none'>
          {topFolders.length > 0 && renderFolderItem(topFolders[0])}

          {topFolders.slice(1).map(renderFolderItem)}
        </div>
        <div className='mt-auto pt-6 flex flex-col transition-none'>
          <div className='text-xs font-bold text-text-secondary uppercase tracking-[0.2em] mb-3 px-4 transition-none'>
            {t('folders.archiveHeader')}
          </div>
          <div className='transition-none'>{bottomFolders.map(renderFolderItem)}</div>
        </div>
      </div>

      <div className='py-6 border-t border-border-primary bg-bg-primary/30 flex flex-col items-center px-3 space-y-3 transition-none'>
        <div className='w-full transition-none'>
          <button
            onClick={onSettingsClick}
            className='flex items-center justify-center transition-none font-medium bg-bg-tertiary/40 text-text-secondary border border-border-primary/50 hover:bg-bg-tertiary hover:border-border-secondary active:scale-95 w-full gap-3 px-3 py-3 rounded-2xl'
            title={t('settings.title')}
            aria-label={t('settings.title')}
          >
            <Settings className='w-4 h-4 flex-shrink-0 transition-none' />
            <span className='text-base font-medium whitespace-nowrap transition-none'>
              {t('settings.title')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
