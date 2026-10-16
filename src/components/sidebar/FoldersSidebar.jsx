import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  CalendarClock,
  Copy,
  FolderPlus,
  History,
  Paperclip,
  Settings,
  Sparkles
} from 'lucide-react'

import {
  DEFAULT_FOLDER_ICON,
  DEFAULT_FOLDER_NAME,
  FOLDER_ERROR,
  FOLDER_ICONS,
  FOLDER_NAME_MAX_LENGTH
} from '@pear-notes/core/constant.js'
import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { updateFolder } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  getLocalAiIndex,
  getLocalAiOffloadServing,
  loadDuplicateNotes
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { selectAiSuggestionOn } from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  getDuplicatePairRows,
  getNoteCountsPerFolder
} from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getShouldAutoRenameNextFolder,
  setShouldAutoRenameNextFolder
} from '@pear-notes/core/store/slices/uiSlice.js'
import {
  getCurrentVault,
  getHasMultipleVaults,
  getOtherVaults,
  moveToVault
} from '@pear-notes/core/store/slices/vaultsSlice.js'
import { findDuplicateFolder, validateFolderName } from '@pear-notes/core/utils.js'

import { useAttachmentCount } from '../../hooks/useAttachments'
import { useUpcomingCount } from '../../hooks/useUpcomingCount'
import { showContextMenu } from '../../lib/contextMenu'
import { getFolderIconComponent } from '../../lib/folderIcons'
import {
  confirmVaultMove,
  getVaultLabel,
  getVaultMenuItems,
  VAULT_MENU_PREFIX
} from '../../lib/vaultNames'

const ICON_PICKER_WIDTH = 268
const ICON_PICKER_HEIGHT = 400
const ICON_PICKER_EDGE_GAP = 8

export default function FoldersSidebar({
  selectedFolder,
  onSelectFolder,
  folders,
  onCreateNote,
  onCreateFolder,
  onSettingsClick,
  onDeleteFolder,
  toolView = null,
  onSelectTool
}) {
  const { t } = useTranslation()
  const tasksOn = useSelector((state) => selectAiSuggestionOn(state, AI_SUGGESTION.TASKS))
  const relatedOn = useSelector((state) => selectAiSuggestionOn(state, AI_SUGGESTION.RELATED))
  const upcomingCount = useUpcomingCount(Boolean(onSelectTool) && tasksOn)
  const attachmentCount = useAttachmentCount(Boolean(onSelectTool))
  const dispatch = useDispatch()
  const index = useSelector(getLocalAiIndex)
  const duplicateCount = useSelector(getDuplicatePairRows).length
  const serving = useSelector(getLocalAiOffloadServing)
  const showDuplicates = LOCAL_AI_ENABLED && index.enabled && relatedOn

  useEffect(() => {
    if (showDuplicates) dispatch(loadDuplicateNotes())
  }, [dispatch, index.changedAt, showDuplicates])
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [newFolderId, setNewFolderId] = useState(null)
  const [deletingFolderId, setDeletingFolderId] = useState(null)
  const shouldAutoRenameNextFolder = useSelector(getShouldAutoRenameNextFolder)
  const [editName, setEditName] = useState('')
  const [renameError, setRenameError] = useState(null)
  const [iconPicker, setIconPicker] = useState(null)
  const inputRef = useRef(null)
  const iconPickerRef = useRef(null)
  const noteCounts = useSelector(getNoteCountsPerFolder)
  const hasMultipleVaults = useSelector(getHasMultipleVaults)
  const currentVault = useSelector(getCurrentVault)
  const otherVaults = useSelector(getOtherVaults)
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

  const handleCloseIconPicker = () => setIconPicker(null)

  useEffect(() => {
    if (!iconPicker) return
    const onPointerDown = (e) => {
      if (!iconPickerRef.current?.contains(e.target)) handleCloseIconPicker()
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleCloseIconPicker()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    iconPickerRef.current?.querySelector('[data-selected="true"], button')?.focus()
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [iconPicker])

  const handlePickIcon = (icon) => {
    if (iconPicker) dispatch(updateFolder({ id: iconPicker.folderId, icon }))
    handleCloseIconPicker()
  }

  const iconPickerPosition = useMemo(() => {
    if (!iconPicker) return undefined
    const gap = ICON_PICKER_EDGE_GAP
    const maxLeft = Math.max(gap, window.innerWidth - gap - ICON_PICKER_WIDTH)
    const maxTop = Math.max(gap, window.innerHeight - gap - ICON_PICKER_HEIGHT)
    return {
      top: Math.min(iconPicker.y, maxTop),
      left: Math.min(iconPicker.x, maxLeft),
      width: ICON_PICKER_WIDTH
    }
  }, [iconPicker])

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

  const handleMenuAction = (action, folder, anchor) => {
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
      case 'change-icon':
        setIconPicker({
          folderId: folder.id,
          folderName: folder.name || DEFAULT_FOLDER_NAME,
          icon: folder.icon || DEFAULT_FOLDER_ICON,
          x: anchor.x,
          y: anchor.y
        })
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

  const handleMoveFolderToVault = (folder, vaultId) => {
    const vault = otherVaults.find((v) => v.id === vaultId)
    if (!vault) return
    const folderName = folder.name || DEFAULT_FOLDER_NAME
    if (!confirmVaultMove({ vault, folderName, t })) return
    dispatch(moveToVault({ targetId: vaultId, folderKeys: [folder.id] }))
  }

  const handleContextMenu = async (e, folder) => {
    e.preventDefault()
    e.stopPropagation()
    const anchor = { x: e.clientX, y: e.clientY }
    const items = [
      { id: 'new-note', label: t('folders.a11y.newNote') },
      { id: 'new-folder', label: t('folders.newFolder') }
    ]
    if (!folder.isSystem) {
      items.push(
        { type: 'separator' },
        { id: 'rename', label: t('folders.buttons.rename') },
        { id: 'change-icon', label: t('folders.buttons.changeIcon') },
        ...(otherVaults.length > 0
          ? [{ label: t('vaults.move.menu'), submenu: getVaultMenuItems(otherVaults, t) }]
          : []),
        { id: 'delete', label: t('folders.buttons.delete') }
      )
    }
    const result = await showContextMenu(items)
    if (result?.startsWith(VAULT_MENU_PREFIX)) {
      handleMoveFolderToVault(folder, result.slice(VAULT_MENU_PREFIX.length))
      return
    }
    if (result) handleMenuAction(result, folder, anchor)
  }

  const topFolders = useMemo(() => folders.filter((f) => !f.isTrash), [folders])
  const bottomFolders = useMemo(() => folders.filter((f) => f.isTrash), [folders])

  const renderFolderItem = (folder) => {
    const Icon = getFolderIconComponent(folder.icon)
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

  const renderToolItem = (view, Icon, label, count) => {
    const isSelected = toolView === view
    return (
      <button
        key={view}
        onClick={() => onSelectTool(view)}
        aria-pressed={isSelected}
        className={`flex items-center relative mb-2 w-full px-4 py-3 gap-4 rounded-xl transition-colors duration-0
          ${
            isSelected
              ? 'bg-[var(--accent-selected-bg)] text-accent-primary border border-[var(--accent-selected-border)] shadow-[0_4px_12px_rgba(var(--accent-primary),0.1)]'
              : 'bg-transparent text-text-secondary hover:bg-bg-tertiary border border-transparent'
          }`}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'opacity-100 scale-110' : 'opacity-70 scale-100'}`}
        />
        <span
          className={`flex-1 text-left block text-base tracking-tight whitespace-nowrap truncate leading-[20px] h-5 ${isSelected ? 'font-bold' : 'font-medium'}`}
        >
          {label}
        </span>
        {count > 0 && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${isSelected ? 'text-accent-primary bg-accent-primary/20' : 'text-text-secondary bg-bg-tertiary/50'}`}
          >
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className='flex flex-col h-full w-full bg-bg-primary/80 backdrop-blur-xl border-r border-border-primary relative transition-none'>
      <div className='px-6 pt-10 pb-4 border-b border-border-primary/50 min-h-[110px] flex flex-col transition-none'>
        <div className='flex items-center justify-between h-[40px] transition-none'>
          <div className='min-w-0'>
            <h2 className='text-title font-bold text-text-primary tracking-tight transition-none truncate'>
              {hasMultipleVaults ? getVaultLabel(currentVault, t) : t('folders.title')}
            </h2>
            {hasMultipleVaults && (
              <p className='text-xs font-medium text-text-tertiary'>{t('folders.title')}</p>
            )}
          </div>
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
          {onSelectTool && (
            <>
              <div className='text-sm font-bold text-text-secondary tracking-[0.1em] mb-3 px-4 transition-none'>
                {t('tools.header')}
              </div>
              {tasksOn &&
                renderToolItem('upcoming', CalendarClock, t('tools.upcoming'), upcomingCount)}
              {attachmentCount > 0 &&
                renderToolItem('attachments', Paperclip, t('tools.attachments'), attachmentCount)}
              {showDuplicates &&
                renderToolItem('duplicates', Copy, t('tools.duplicates'), duplicateCount)}
              {renderToolItem('recap', History, t('tools.recap'), 0)}
            </>
          )}
          <div
            className={`text-sm font-bold text-text-secondary tracking-[0.1em] mb-3 px-4 transition-none ${onSelectTool ? 'mt-6' : ''}`}
          >
            {t('folders.archiveHeader')}
          </div>
          <div className='transition-none'>{bottomFolders.map(renderFolderItem)}</div>
        </div>
      </div>

      <div className='py-6 border-t border-border-primary bg-bg-primary/30 flex flex-col items-center px-3 space-y-3 transition-none'>
        {serving.active && (
          <div
            role='status'
            className='w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary/10 text-accent-primary text-xs font-semibold'
          >
            <Sparkles className='w-3.5 h-3.5 flex-shrink-0 animate-pulse' />
            <span className='truncate'>
              {serving.activeDevice
                ? t('settings.onDeviceAi.offload.answeringFor', { device: serving.activeDevice })
                : t('settings.onDeviceAi.offload.answeringForDevice')}
            </span>
          </div>
        )}
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

      {iconPicker &&
        createPortal(
          <div
            ref={iconPickerRef}
            role='dialog'
            aria-label={t('folders.iconPickerTitle', { name: iconPicker.folderName })}
            className='fixed z-[500] p-3 rounded-xl bg-bg-panel-secondary border border-border-primary shadow-xl'
            style={iconPickerPosition}
          >
            <div className='px-1 pb-2.5 text-xs font-semibold text-text-secondary truncate'>
              {t('folders.iconPickerTitle', { name: iconPicker.folderName })}
            </div>
            <div className='grid grid-cols-5 gap-1.5'>
              {FOLDER_ICONS.map((icon) => {
                const PickIcon = getFolderIconComponent(icon)
                const isPicked = iconPicker.icon === icon
                return (
                  <button
                    key={icon}
                    type='button'
                    data-selected={isPicked}
                    onClick={() => handlePickIcon(icon)}
                    title={t(`folders.icons.${icon}`)}
                    aria-label={t(`folders.icons.${icon}`)}
                    aria-pressed={isPicked}
                    className={`w-11 h-11 grid place-items-center rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
                      isPicked
                        ? 'bg-[var(--accent-selected-bg)] border-[var(--accent-selected-border)] text-accent-primary'
                        : 'border-transparent text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <PickIcon className='w-5 h-5' />
                  </button>
                )
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
