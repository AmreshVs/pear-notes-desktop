import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  Check,
  Film,
  Folder,
  FolderInput,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  Lock,
  LockOpen,
  Mic,
  Paperclip,
  Pin,
  RotateCcw,
  Search,
  SquarePen,
  Trash2,
  Undo2,
  X
} from 'lucide-react'

import {
  ALL_NOTES_KEY,
  RECENTLY_DELETED_KEY,
  TRASH_RETENTION_DAYS
} from '@pear-notes/core/constant.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  deleteNote,
  deleteNotes,
  getFilteredNotes,
  getNoteData,
  getSelectedNote,
  moveNotes,
  purgeExpiredTrash,
  restoreNote,
  restoreNotes,
  setSelectedNote,
  updateNote
} from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getLocalPreferences } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getInviterStatus, setShowPairingInput } from '@pear-notes/core/store/slices/syncSlice.js'
import { getHyperdriveAddress, setShowSettings } from '@pear-notes/core/store/slices/uiSlice.js'
import {
  formatDate,
  getAttachmentInfo,
  getFirstImage,
  getGroupTitle,
  getPreview,
  NOTES_LIST_GROUP
} from '@pear-notes/core/utils.js'

import { copyToClipboard } from '../../lib/clipboard'
import { showContextMenu } from '../../lib/contextMenu'
import { isNoteUnlocked, useNoteLockVersion } from '../../lib/noteLock'
import { toggleNoteLock } from '../../lib/noteLockActions'
import { useNoteLockPassword } from '../../lib/noteLockPasswordContext'

const ATTACHMENT_ICONS = {
  image: ImageIcon,
  video: Film,
  audio: Mic,
  file: Paperclip,
  mixed: Paperclip
}

const AttachmentPreview = ({ info, isSelected }) => {
  const { t } = useTranslation()
  const Icon = ATTACHMENT_ICONS[info.kind] || Paperclip
  let label = ''
  switch (info.kind) {
    case 'image':
      label = t('noteCard.attachment.image_' + (info.count === 1 ? 'one' : 'other'), {
        count: info.count
      })
      break
    case 'video':
      label = t('noteCard.attachment.video_' + (info.count === 1 ? 'one' : 'other'), {
        count: info.count
      })
      break
    case 'audio':
      label = t('noteCard.attachment.audio_' + (info.count === 1 ? 'one' : 'other'), {
        count: info.count
      })
      break
    case 'file':
      label = t('noteCard.attachment.file_' + (info.count === 1 ? 'one' : 'other'), {
        count: info.count
      })
      break
    case 'mixed':
      label = t('noteCard.attachment.mixed', { count: info.count })
      break
    default:
      label = t('noteCard.attachment.file_' + (info.count === 1 ? 'one' : 'other'), {
        count: info.count
      })
  }

  return (
    <p
      className={`text-sm leading-relaxed opacity-80 flex items-center gap-1.5
        ${isSelected ? 'text-text-primary' : 'text-text-primary/70'}`}
    >
      <Icon className='w-3.5 h-3.5 flex-shrink-0 opacity-80' />
      <span className='truncate'>{label}</span>
    </p>
  )
}

const NotesItem = memo(
  ({
    noteKey: key,
    onMenuAction,
    allFolders,
    selectedFolder,
    isLast,
    isSelecting,
    isChecked,
    onToggleSelect
  }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const noteData = useSelector(getNoteData(key))
    const selectedNote = useSelector(getSelectedNote)

    useNoteLockVersion()
    const isMasked = noteData?.locked === true && !isNoteUnlocked(key)

    const rawImgSrc = useMemo(() => getFirstImage(noteData?.note), [noteData?.note])
    const resolvedImgSrc = useSelector((state) => getHyperdriveAddress(state, rawImgSrc))
    const imgSrc = isMasked ? null : resolvedImgSrc

    const rawPreviewText = useMemo(
      () => getPreview(noteData?.note, noteData?.note),
      [noteData?.note]
    )
    const attachmentInfo = useMemo(() => getAttachmentInfo(noteData?.note), [noteData?.note])
    const showAttachmentPreview = !isMasked && !rawPreviewText && !!attachmentInfo
    const previewText = isMasked
      ? t('noteCard.lockedSummary')
      : rawPreviewText || t('noteCard.noAdditionalText')

    const isSelected = selectedNote === key

    const availableMoveFolders = allFolders.filter(
      (f) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== noteData?.folderKey
    )

    const handleRowClick = useCallback(
      (event) => {
        if (isSelecting || event.metaKey || event.ctrlKey || event.shiftKey) {
          event.preventDefault()
          onToggleSelect(key, event)
          return
        }
        dispatch(setSelectedNote(key))
      },
      [dispatch, isSelecting, onToggleSelect, key]
    )

    const isTrash = selectedFolder === RECENTLY_DELETED_KEY

    const handleContextMenu = useCallback(
      async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const locked = noteData?.locked === true
        const pinned = noteData?.pinned === true
        const moveSubmenu =
          availableMoveFolders.length > 0
            ? availableMoveFolders.map((f) => ({ id: `move:${f.id}`, label: f.name }))
            : [{ label: t('noteCard.actions.noFolders'), enabled: false }]

        if (isSelecting && isChecked) {
          const bulkResult = await showContextMenu(
            isTrash
              ? [
                  { id: 'bulkRestore', label: t('notesList.selection.restoreSelected') },
                  { type: 'separator' },
                  { id: 'bulkDelete', label: t('notesList.selection.deleteSelected') }
                ]
              : [
                  { label: t('notesList.selection.moveSelected'), submenu: moveSubmenu },
                  { type: 'separator' },
                  { id: 'bulkDelete', label: t('notesList.selection.deleteSelected') }
                ]
          )
          if (!bulkResult) return
          if (bulkResult.startsWith('move:')) onMenuAction('bulkMove', key, bulkResult.slice(5))
          else onMenuAction(bulkResult, key)
          return
        }

        const result = await showContextMenu(
          isTrash
            ? [
                { id: 'restore', label: t('noteCard.actions.restore') },
                { type: 'separator' },
                { id: 'delete', label: t('folderView.permanentlyDeleteTitle') }
              ]
            : [
                {
                  id: 'togglePin',
                  label: pinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin')
                },
                { type: 'separator' },
                { label: t('noteCard.actions.moveToFolder'), submenu: moveSubmenu },
                { type: 'separator' },
                { id: 'copy', label: t('noteCard.actions.copyNote') },
                {
                  id: 'toggleLock',
                  label: locked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock')
                },
                { type: 'separator' },
                { id: 'delete', label: t('noteCard.actions.delete') }
              ]
        )
        if (!result) return
        if (result.startsWith('move:')) onMenuAction('move', key, result.slice(5))
        else onMenuAction(result, key)
      },
      [
        availableMoveFolders,
        noteData?.locked,
        noteData?.pinned,
        isTrash,
        isSelecting,
        isChecked,
        onMenuAction,
        key,
        t
      ]
    )

    const handleRowKeyDown = useCallback(
      (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (isSelecting) {
            onToggleSelect(key, event)
            return
          }
          dispatch(setSelectedNote(key))
          return
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        const rows = Array.from(
          event.currentTarget.closest('[role="listbox"]')?.querySelectorAll('[role="option"]') || []
        )
        const index = rows.indexOf(event.currentTarget)
        const next = rows[event.key === 'ArrowDown' ? index + 1 : index - 1]
        if (next) next.focus()
      },
      [dispatch, isSelecting, onToggleSelect, key]
    )

    return (
      <div className='relative'>
        <div
          key={key}
          role='option'
          tabIndex={isSelected ? 0 : -1}
          aria-selected={isSelecting ? isChecked : isSelected}
          onClick={handleRowClick}
          onKeyDown={handleRowKeyDown}
          onContextMenu={handleContextMenu}
          className={`relative ${isSelecting ? 'pl-3' : 'pl-6'} pr-2 py-3 cursor-pointer transition-colors duration-0 group ${!isLast ? 'border-b border-overlay-subtle' : ''}
          ${
            isChecked || (!isSelecting && isSelected)
              ? 'bg-[var(--accent-selected-bg)] shadow-inner'
              : 'bg-transparent hover:bg-overlay-faint'
          }`}
        >
          <div className='flex items-stretch justify-between gap-3'>
            {isSelecting && (
              <div className='flex items-center pr-1 flex-shrink-0'>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                  ${
                    isChecked
                      ? 'bg-accent-primary border-accent-primary text-accent-on-primary'
                      : 'border-border-secondary text-transparent'
                  }`}
                >
                  <Check className='w-3.5 h-3.5' strokeWidth={3} />
                </div>
              </div>
            )}
            <div className='flex-1 min-w-0 flex flex-col justify-center'>
              <h3
                className={`text-base tracking-tight mb-0.5 flex items-center gap-1.5
                ${isSelected ? 'text-accent-primary font-bold' : 'text-text-primary font-bold transition-colors group-hover:text-accent-primary'}`}
              >
                {noteData?.pinned && !isTrash && (
                  <Pin className='w-3.5 h-3.5 text-accent-primary flex-shrink-0 fill-accent-primary' />
                )}
                {noteData?.locked &&
                  (isMasked ? (
                    <Lock className='w-3.5 h-3.5 text-accent-primary flex-shrink-0' />
                  ) : (
                    <LockOpen className='w-3.5 h-3.5 text-accent-primary flex-shrink-0' />
                  ))}
                <span className='truncate'>{noteData?.title || t('noteCard.untitled')}</span>
              </h3>
              {showAttachmentPreview ? (
                <AttachmentPreview info={attachmentInfo} isSelected={isSelected} />
              ) : (
                <p
                  className={`text-sm line-clamp-2 leading-relaxed opacity-80
                  ${isSelected ? 'text-text-primary' : 'text-text-primary/70'}`}
                >
                  {previewText}
                </p>
              )}
              <div className='flex items-center gap-1.5 mt-2 opacity-50 text-xs font-bold uppercase tracking-wider'>
                {selectedFolder === ALL_NOTES_KEY && noteData?.folderKey && (
                  <>
                    <div className='flex items-center gap-1.5 min-w-0'>
                      <Folder className='w-3 h-3 flex-shrink-0' />
                      <span className='truncate'>
                        {allFolders.find((f) => f.id === noteData.folderKey)?.name ||
                          t('folders.title')}
                      </span>
                    </div>
                    <span className='flex-shrink-0'>•</span>
                  </>
                )}
                <span className='flex-shrink-0 whitespace-nowrap'>
                  {formatDate(noteData?.updatedAt || noteData?.createdAt)}
                </span>
              </div>
            </div>

            {imgSrc && (
              <div className='flex items-center gap-1 ml-2 flex-shrink-0 relative'>
                <div className='relative flex-none h-[56px] w-[56px] rounded-lg overflow-hidden border border-white/10 shadow-sm bg-bg-tertiary/20 hardware-accelerated'>
                  <img
                    src={imgSrc}
                    alt='Note attachment'
                    className='w-full h-full object-cover'
                    decoding='async'
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

NotesItem.displayName = 'NotesItem'

export default function NotesList({
  selectedFolder,
  searchQuery,
  onSearchChange,
  onCreateNote,
  onToggleSidebar,
  isSidebarCollapsed
}) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const filteredNotes = useSelector(getFilteredNotes)
  const folders = useSelector(getFolders)
  const lockMethod = useSelector(getLockMethod)
  const { requestUnlockPassword, showLockUnavailable } = useNoteLockPassword()
  const { step } = useSelector(getInviterStatus)
  const localPreferences = useSelector(getLocalPreferences)
  const isSynced = localPreferences['isSynced'] === 'true'
  const syncing = step === 'syncing'
  const currentFolderName =
    folders.find((f) => f.id === selectedFolder)?.name || t('folders.systemIcons.all')

  const [selection, setSelection] = useState({ folder: null, active: false, keys: [] })
  const anchorKeyRef = useRef(null)
  const isSelecting = selection.active && selection.folder === selectedFolder

  const handleLinkDevice = useCallback(() => {
    dispatch(setShowPairingInput(true))
  }, [dispatch])

  const handleRestoreBackup = useCallback(() => {
    dispatch(setShowSettings('backup'))
  }, [dispatch])

  const groupOrder = useMemo(
    () => [
      NOTES_LIST_GROUP.PINNED,
      NOTES_LIST_GROUP.TODAY,
      NOTES_LIST_GROUP.YESTERDAY,
      NOTES_LIST_GROUP.L7DAYS,
      NOTES_LIST_GROUP.L30DAYS
    ],
    []
  )

  const isTrash = selectedFolder === RECENTLY_DELETED_KEY

  const groupedNotes = useMemo(() => {
    return filteredNotes.reduce((acc, note) => {
      const title =
        !isTrash && note.value?.pinned === true ? NOTES_LIST_GROUP.PINNED : getGroupTitle(note)
      if (!acc[title]) acc[title] = []
      acc[title].push(note)
      return acc
    }, {})
  }, [filteredNotes, isTrash])

  const sortedGroups = useMemo(() => {
    return Object.keys(groupedNotes).sort((a, b) => {
      const idxA = groupOrder.indexOf(a)
      const idxB = groupOrder.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return b.localeCompare(a)
    })
  }, [groupedNotes, groupOrder])

  const orderedKeys = useMemo(
    () => sortedGroups.flatMap((group) => groupedNotes[group].map((note) => note.key)),
    [sortedGroups, groupedNotes]
  )

  const checkedKeys = useMemo(
    () => (isSelecting ? selection.keys.filter((key) => orderedKeys.includes(key)) : []),
    [isSelecting, selection.keys, orderedKeys]
  )

  const exitSelection = useCallback(() => {
    anchorKeyRef.current = null
    setSelection({ folder: null, active: false, keys: [] })
  }, [])

  const handleToggleSelect = useCallback(
    (key, event) => {
      setSelection((prev) => {
        const active = prev.active && prev.folder === selectedFolder
        const keys = active ? prev.keys : []
        const anchorKey = active ? anchorKeyRef.current : null

        if (event?.shiftKey && anchorKey && anchorKey !== key) {
          const from = orderedKeys.indexOf(anchorKey)
          const to = orderedKeys.indexOf(key)
          if (from !== -1 && to !== -1) {
            const range = orderedKeys.slice(Math.min(from, to), Math.max(from, to) + 1)
            return { folder: selectedFolder, active: true, keys: [...new Set([...keys, ...range])] }
          }
        }

        anchorKeyRef.current = key
        return {
          folder: selectedFolder,
          active: true,
          keys: keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]
        }
      })
    },
    [orderedKeys, selectedFolder]
  )

  const handleStartSelecting = useCallback(() => {
    anchorKeyRef.current = null
    setSelection({ folder: selectedFolder, active: true, keys: [] })
  }, [selectedFolder])

  const handleSelectAll = useCallback(() => {
    anchorKeyRef.current = null
    setSelection({ folder: selectedFolder, active: true, keys: orderedKeys })
  }, [orderedKeys, selectedFolder])

  const handleDeselectAll = useCallback(() => {
    anchorKeyRef.current = null
    setSelection((prev) => ({ ...prev, keys: [] }))
  }, [])

  const handleBulkDelete = useCallback(() => {
    if (checkedKeys.length === 0) return
    const message = isTrash
      ? t('notesList.selection.confirmPermanentDelete', { count: checkedKeys.length })
      : t('notesList.selection.confirmDelete', { count: checkedKeys.length })
    if (!window.confirm(message)) return
    dispatch(deleteNotes(checkedKeys))
    exitSelection()
  }, [checkedKeys, dispatch, exitSelection, isTrash, t])

  const handleBulkRestore = useCallback(() => {
    if (checkedKeys.length === 0) return
    dispatch(restoreNotes(checkedKeys))
    exitSelection()
  }, [checkedKeys, dispatch, exitSelection])

  const handleBulkMove = useCallback(
    async (folderId) => {
      if (checkedKeys.length === 0) return
      let targetFolder = folderId
      if (!targetFolder) {
        const moveFolders = folders.filter(
          (f) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== selectedFolder
        )
        const result = await showContextMenu(
          moveFolders.length > 0
            ? moveFolders.map((f) => ({ id: `move:${f.id}`, label: f.name }))
            : [{ label: t('noteCard.actions.noFolders'), enabled: false }]
        )
        if (!result || !result.startsWith('move:')) return
        targetFolder = result.slice(5)
      }
      dispatch(moveNotes({ keys: checkedKeys, folderKey: targetFolder }))
      exitSelection()
    },
    [checkedKeys, dispatch, exitSelection, folders, selectedFolder, t]
  )

  useEffect(() => {
    if (isTrash) dispatch(purgeExpiredTrash())
  }, [isTrash, dispatch])

  useEffect(() => {
    if (!isSelecting) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        exitSelection()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
          return
        }
        event.preventDefault()
        handleSelectAll()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSelecting, exitSelection, handleSelectAll])

  const handleMenuAction = useCallback(
    async (action, noteKey, folderId) => {
      const noteData = filteredNotes.find((n) => n.key === noteKey)

      switch (action) {
        case 'bulkMove':
          await handleBulkMove(folderId)
          break
        case 'bulkDelete':
          handleBulkDelete()
          break
        case 'move':
          dispatch(
            updateNote({
              key: noteKey,
              folderKey: folderId
            })
          )
          break
        case 'copy': {
          const text = noteData?.value?.note || ''
          try {
            const parser = new DOMParser()
            const doc = parser.parseFromString(text, 'text/html')
            const cleanText = doc.body.textContent || doc.body.innerText || ''
            await copyToClipboard(cleanText)
          } catch (e) {
            console.error('Failed to copy', e)
          }
          break
        }
        case 'toggleLock':
          await toggleNoteLock({
            key: noteKey,
            currentlyLocked: noteData?.value?.locked === true,
            dispatch,
            lockMethod,
            requestPassword: requestUnlockPassword,
            onUnavailable: showLockUnavailable
          })
          break
        case 'togglePin':
          dispatch(
            updateNote({
              key: noteKey,
              pinned: !(noteData?.value?.pinned === true)
            })
          )
          break
        case 'restore':
          dispatch(restoreNote(noteKey))
          break
        case 'bulkRestore':
          handleBulkRestore()
          break
        case 'delete':
          if (selectedFolder === RECENTLY_DELETED_KEY) {
            if (window.confirm(t('folderView.permanentlyDeleteTitle') + '?')) {
              dispatch(deleteNote(noteKey))
            }
          } else {
            dispatch(deleteNote(noteKey))
          }
          break
      }
    },
    [
      dispatch,
      filteredNotes,
      selectedFolder,
      lockMethod,
      requestUnlockPassword,
      showLockUnavailable,
      handleBulkMove,
      handleBulkDelete,
      handleBulkRestore,
      t
    ]
  )

  const renderNotesList = useCallback(
    (note, index, array) => {
      const isLast = index === array.length - 1
      return (
        <NotesItem
          key={note.key}
          noteKey={note.key}
          onMenuAction={handleMenuAction}
          allFolders={folders}
          selectedFolder={selectedFolder}
          isLast={isLast}
          isSelecting={isSelecting}
          isChecked={checkedKeys.includes(note.key)}
          onToggleSelect={handleToggleSelect}
        />
      )
    },
    [folders, handleMenuAction, selectedFolder, isSelecting, checkedKeys, handleToggleSelect]
  )

  const getGroupName = (group) => {
    switch (group) {
      case NOTES_LIST_GROUP.PINNED:
        return t('folderView.sections.pinned')
      case NOTES_LIST_GROUP.TODAY:
        return t('folderView.sections.today')
      case NOTES_LIST_GROUP.YESTERDAY:
        return t('folderView.sections.yesterday')
      case NOTES_LIST_GROUP.L7DAYS:
        return t('folderView.sections.last7Days')
      case NOTES_LIST_GROUP.L30DAYS:
        return t('folderView.sections.older')
      default:
        return group
    }
  }

  return (
    <div className='flex flex-col h-full w-full bg-bg-secondary/95 backdrop-blur-xl border-r border-border-primary/50 relative overflow-hidden hardware-accelerated'>
      <div className='px-6 pt-10 pb-4 border-b border-border-primary/30 min-h-[140px] flex flex-col gap-4'>
        <div className='flex items-center justify-between h-[40px]'>
          <div className='flex items-center gap-4'>
            <button
              onClick={onToggleSidebar}
              className='p-2 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200'
              title={t('notesList.toggleSidebar')}
              aria-label={t('notesList.toggleSidebar')}
            >
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='w-5 h-5'
              >
                <rect width='18' height='18' x='3' y='3' rx='2' />
                <path d='M9 3v18' />
                {!isSidebarCollapsed && (
                  <path
                    d='M5 3h4v18H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z'
                    fill='currentColor'
                    className='animate-in fade-in duration-300'
                  />
                )}
              </svg>
            </button>
            <div className='flex flex-col min-w-0'>
              <h2
                title={currentFolderName}
                className='font-bold text-title text-text-primary tracking-tight truncate max-w-[220px] leading-tight'
              >
                {currentFolderName}
              </h2>
              <span
                role='status'
                aria-live='polite'
                className='text-xs font-bold text-text-secondary uppercase tracking-wider'
              >
                {isSelecting
                  ? t('notesList.selection.selectedCount', { count: checkedKeys.length })
                  : filteredNotes.length === 1
                    ? t('folderView.noteCount_one', { count: 1 })
                    : t('folderView.noteCount_other', { count: filteredNotes.length })}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-1.5'>
            {isSelecting ? (
              <>
                <button
                  onClick={
                    checkedKeys.length === orderedKeys.length && orderedKeys.length > 0
                      ? handleDeselectAll
                      : handleSelectAll
                  }
                  disabled={orderedKeys.length === 0}
                  className='px-3 py-2 rounded-lg text-sm font-bold bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'
                >
                  {checkedKeys.length === orderedKeys.length && orderedKeys.length > 0
                    ? t('notesList.selection.deselectAll')
                    : t('notesList.selection.selectAll')}
                </button>
                <button
                  onClick={exitSelection}
                  className='p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200'
                  title={t('notesList.selection.done')}
                  aria-label={t('notesList.selection.done')}
                >
                  <X className='w-5 h-5' />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartSelecting}
                  disabled={filteredNotes.length === 0}
                  className='p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'
                  title={t('notesList.selection.select')}
                  aria-label={t('notesList.selection.select')}
                >
                  <ListChecks className='w-5 h-5' />
                </button>
                <button
                  onClick={onCreateNote}
                  className='p-2 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary border border-border-secondary text-text-primary active:scale-95 transition-all duration-200'
                  title={t('folders.a11y.newNote')}
                  aria-label={t('folders.a11y.newNote')}
                >
                  <SquarePen className='w-5 h-5' />
                </button>
              </>
            )}
          </div>
        </div>

        <div className='mt-2'>
          <div className='relative group'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-accent-primary transition-colors' />
            <input
              type='search'
              aria-label={t('search.title')}
              placeholder={t('folderView.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className='w-full pl-9 pr-4 py-2.5 rounded-xl text-base bg-bg-tertiary/30 text-text-primary placeholder-text-tertiary/40 border border-border-primary/50 focus:border-accent-primary/40 focus:bg-bg-tertiary/60 transition-all shadow-inner'
            />
          </div>
        </div>
      </div>

      <div
        className='flex-1 overflow-y-auto py-2 scrollbar-hide'
        role={filteredNotes.length === 0 ? undefined : 'listbox'}
        aria-multiselectable={isSelecting || undefined}
        aria-label={t('folders.systemIcons.all')}
      >
        {filteredNotes.length === 0 ? (
          <div className='flex-1 flex flex-col items-center justify-center py-10'>
            {syncing ? (
              <div className='flex flex-col items-center gap-4 animate-in fade-in duration-700'>
                <Loader2 className='w-8 h-8 text-accent-primary animate-spin' />
                <div className='space-y-1 text-center'>
                  <p className='text-base text-text-primary font-bold'>
                    {t('pairing.overlay.syncingTitle')}
                  </p>
                  <p className='text-sm text-text-tertiary leading-relaxed px-10'>
                    {t('pairing.overlay.syncingDesc')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {searchQuery ? (
                  <div className='w-full px-8 flex flex-col items-center justify-center gap-4 py-12'>
                    <div className='space-y-3 text-center'>
                      <p className='text-lg text-text-primary font-bold tracking-tight'>
                        {t('folderView.empty.noMatchesTitle')}
                      </p>
                      <p className='text-sm text-text-tertiary/80 font-medium'>
                        {t('folderView.empty.noMatchesSubtitle')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='w-full px-8 space-y-10'>
                    {isTrash ? (
                      <div className='flex flex-col items-center gap-2 text-center'>
                        <p className='text-lg text-text-primary font-bold tracking-tight'>
                          {t('folderView.empty.trashEmptyTitle')}
                        </p>
                        <p className='text-sm text-text-tertiary leading-relaxed'>
                          {t('folderView.empty.trashEmptySubtitle', { days: TRASH_RETENTION_DAYS })}
                        </p>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center gap-5 text-center'>
                        <div className='space-y-1.5'>
                          <p className='text-lg text-text-primary font-bold tracking-tight'>
                            {t('folderView.empty.noNotesTitle')}
                          </p>
                          <p className='text-sm text-text-tertiary leading-relaxed'>
                            {t('folderView.empty.noNotesSubtitle')}
                          </p>
                        </div>
                        <button
                          onClick={onCreateNote}
                          className='w-full py-3.5 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base hover:bg-accent-primary-hover transition-colors active:scale-95'
                        >
                          {t('folderView.empty.newNoteBtn')}
                        </button>
                      </div>
                    )}

                    {!isTrash && !isSynced && (
                      <div className='pt-2 space-y-3 border-t border-border-primary/30'>
                        <div className='text-center space-y-1 pt-6'>
                          <p className='text-base font-bold text-text-primary'>
                            {t('folderView.empty.onboardingTitle')}
                          </p>
                          <p className='text-sm text-text-tertiary leading-relaxed'>
                            {t('folderView.empty.onboardingSubtitle')}
                          </p>
                        </div>

                        <button
                          onClick={handleLinkDevice}
                          className='w-full py-3 rounded-xl font-bold text-base bg-bg-tertiary/60 text-text-primary border border-border-primary hover:bg-bg-tertiary transition-colors active:scale-95'
                        >
                          {t('folderView.empty.connectBtn')}
                        </button>

                        <button
                          onClick={handleRestoreBackup}
                          className='w-full py-2.5 rounded-xl font-semibold text-sm text-text-tertiary hover:text-text-primary hover:bg-overlay-subtle transition-colors active:scale-95 flex items-center justify-center gap-2'
                        >
                          <RotateCcw className='w-4 h-4' />
                          {t('folderView.empty.restoreBtn')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4'>
            {isTrash && (
              <p className='px-6 pb-3 text-xs text-text-tertiary leading-relaxed'>
                {t('folderView.trashRetentionNotice', { days: TRASH_RETENTION_DAYS })}
              </p>
            )}
            {sortedGroups.map((group) => (
              <div key={group} className='mb-6'>
                <h3 className='px-6 py-2 text-xs font-bold text-text-primary uppercase tracking-[0.2em] sticky top-0 bg-bg-secondary/95 backdrop-blur-md z-10 border-b border-overlay-subtle transform-cpu hardware-accelerated'>
                  {getGroupName(group)}
                </h3>
                <div>
                  {groupedNotes[group].map((note, index) =>
                    renderNotesList(note, index, groupedNotes[group])
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isSelecting && (
        <div className='px-4 py-3 border-t border-border-primary/40 bg-bg-secondary/95 backdrop-blur-xl flex items-center gap-2'>
          <button
            onClick={isTrash ? handleBulkRestore : () => handleBulkMove()}
            disabled={checkedKeys.length === 0}
            className='flex-1 py-2.5 rounded-xl font-bold text-sm bg-bg-tertiary/60 text-text-primary border border-border-primary hover:bg-bg-tertiary transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {isTrash ? <Undo2 className='w-4 h-4' /> : <FolderInput className='w-4 h-4' />}
            {isTrash ? t('notesList.selection.restore') : t('notesList.selection.move')}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={checkedKeys.length === 0}
            className='flex-1 py-2.5 rounded-xl font-bold text-sm bg-accent-danger/10 text-accent-danger border border-accent-danger/20 hover:bg-accent-danger/20 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            <Trash2 className='w-4 h-4' />
            {isTrash ? t('folderView.permanentlyDeleteTitle') : t('noteCard.actions.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
