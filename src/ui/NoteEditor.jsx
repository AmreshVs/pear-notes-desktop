import { useEffect, useRef, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { formatRelativeDate } from '../utils/formatters'
import RichTextEditor from './RichTextEditor'
import FormattingToolbar from './FormattingToolbar'
import { unlockNote, isNoteUnlocked, markNoteUnlocked, useNoteLockVersion } from '../lib/noteLock'
import { toggleNoteLock } from '../lib/noteLockActions'
import { isDeviceAuthSupported } from '../lib/deviceAuth'
import { useNoteLockPassword } from '../lib/noteLockPasswordContext'
import { useLockedNoteProtection } from '../hooks/useLockedNoteProtection'
import { getNoteData, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getEditorTitle,
  getEditorContent,
  getEditorContentText,
  getEditorInstance,
  setEditorTitle,
  setEditorContent,
  setEditorInstance
} from '@pear-notes/core/store/slices/editorSlice.js'
import { useSelector, useDispatch } from 'react-redux'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getSyncedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getFontFamily, getEditorFontSize, getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import { getFontFamilyValue } from '../utils/fonts'
import { showContextMenu } from '../lib/contextMenu'



export default function NoteEditor({ onUpdate, onDelete, onEditorReady }) {
  const dispatch = useDispatch()
  const selectedNoteKey = useSelector(getSelectedNote)
  const rawNoteData = useSelector(getNoteData(selectedNoteKey))
  const noteData = useMemo(() => rawNoteData || {}, [rawNoteData])
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const editorFontFamily = getFontFamilyValue(fontFamily)

  const title = useSelector(getEditorTitle)
  const content = useSelector(getEditorContent)
  const contentText = useSelector(getEditorContentText)
  const editorInstance = useSelector(getEditorInstance)

  const titleRef = useRef(null)
  const richTextEditorRef = useRef(null)
  const folders = useSelector(getFolders)
  const syncedDevices = useSelector(getSyncedDevices)
  const localDevice = useMemo(() => syncedDevices.find((d) => d.isLocal), [syncedDevices])

  useNoteLockVersion()
  const [unlocking, setUnlocking] = useState(false)
  const [authSupported, setAuthSupported] = useState(true)
  const lockMethod = useSelector(getLockMethod)
  const { requestUnlockPassword, showLockUnavailable } = useNoteLockPassword()
  const isLocked = noteData?.locked === true
  const isPinned = noteData?.pinned === true
  const noteUnlocked = isNoteUnlocked(selectedNoteKey)
  const showLockScreen = isLocked && !noteUnlocked

  useLockedNoteProtection(isLocked && noteUnlocked)

  useEffect(() => {
    let active = true
    isDeviceAuthSupported().then((supported) => {
      if (active) setAuthSupported(supported)
    })
    return () => {
      active = false
    }
  }, [])

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      if (lockMethod === 'password') {
        const ok = await requestUnlockPassword()
        if (ok) markNoteUnlocked(selectedNoteKey)
      } else {
        await unlockNote(selectedNoteKey)
      }
    } finally {
      setUnlocking(false)
    }
  }

  const handleToggleLock = async () => {
    await toggleNoteLock({
      key: selectedNoteKey,
      currentlyLocked: isLocked,
      dispatch,
      lockMethod,
      requestPassword: requestUnlockPassword,
      onUnavailable: showLockUnavailable
    })
  }

  const handleTogglePin = () => {
    dispatch(updateNote({ key: selectedNoteKey, pinned: !isPinned }))
  }

  useEffect(() => {
    if (noteData && !noteData?.title && !noteData?.note) {
      setTimeout(() => {
        titleRef.current?.focus()
      }, 100)
    }
  }, [noteData])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (richTextEditorRef.current?.editor) {
        const editor = richTextEditorRef.current.editor
        dispatch(setEditorInstance(editor))
        onEditorReady?.(editor)
      } else if (!noteData) {
        dispatch(setEditorInstance(null))
        onEditorReady?.(null)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [onEditorReady, noteData, dispatch])

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    dispatch(setEditorTitle(newTitle))
    if (noteData) {
      const currentText = editorInstance?.getText() || contentText
      onUpdate({ key: selectedNoteKey, title: newTitle, contentHtml: content, content: currentText })
    }
  }

  const handleContentChange = ({ html, text }) => {
    dispatch(setEditorContent({ html, text }))
    if (noteData) {
      onUpdate({ key: selectedNoteKey, title, contentHtml: html, content: text })
    }
  }

  const handleMoveTo = (folderKey) => {
    if (noteData) {
      dispatch(updateNote({ 
        key: selectedNoteKey, 
        title, 
        note: content,
        folderKey 
      }))
    }
  }

  const handleCopy = () => {
    if (!noteData) return null
    const currentText = editorInstance?.getText() || contentText
    const safeTitle = title || 'Untitled Note'
    const titleHtml = `<h1 style="font-size: 2em; font-weight: 800; margin-bottom: 0.5em;">${safeTitle}</h1>`
    const fullHtml = `${titleHtml}${content || ''}`
    
    return {
      text: `${safeTitle}\n\n${currentText || ''}`,
      html: fullHtml
    }
  }

  const copyNoteToClipboard = async () => {
    const data = handleCopy()
    if (!data) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([data.html], { type: 'text/html' }),
          'text/plain': new Blob([data.text], { type: 'text/plain' })
        })
      ])
    } catch {
      try {
        await navigator.clipboard.writeText(data.text)
      } catch {
        // ignore
      }
    }
  }

  const handleEditorContextMenu = async (e) => {
    e.preventDefault()
    const moveTargets = folders.filter(
      (f) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== noteData?.folderKey
    )
    const moveSubmenu = moveTargets.length > 0
      ? moveTargets.map((f) => ({ id: `move:${f.id}`, label: f.name }))
      : [{ label: 'No other lists', enabled: false }]
    const result = await showContextMenu([
      { role: 'cut', label: 'Cut' },
      { role: 'copy', label: 'Copy' },
      { role: 'paste', label: 'Paste' },
      { role: 'selectAll', label: 'Select All' },
      { type: 'separator' },
      { label: 'Move to', submenu: moveSubmenu },
      { id: 'copyNote', label: 'Copy Note' },
      { id: 'togglePin', label: isPinned ? 'Unpin Note' : 'Pin Note' },
      { id: 'toggleLock', label: isLocked ? 'Remove Lock' : 'Lock Note' },
      { type: 'separator' },
      { id: 'delete', label: 'Delete' }
    ])
    if (!result) return
    if (result.startsWith('move:')) {
      handleMoveTo(result.slice(5))
    } else if (result === 'copyNote') {
      copyNoteToClipboard()
    } else if (result === 'togglePin') {
      handleTogglePin()
    } else if (result === 'toggleLock') {
      handleToggleLock()
    } else if (result === 'delete') {
      onDelete(selectedNoteKey)
    }
  }


  if (!noteData || !selectedNoteKey) {
    return (
      <div className='flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden'>
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />
        
        <div className='relative z-10 flex flex-col items-center text-center px-8 animate-in fade-in zoom-in-95 duration-700'>
          <div className='w-24 h-24 bg-bg-secondary border border-border-primary rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative group'>
            <div className='absolute inset-0 bg-accent-primary/10 blur-xl rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700' />
            <svg
              className='w-10 h-10 text-accent-primary relative z-10 opacity-80'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
          </div>
          
          <div className='space-y-3 max-w-[390px]'>
            <h3 className='text-3xl font-black text-text-primary tracking-tight'>No Note Selected</h3>
            <p className='text-[15px] text-text-tertiary leading-relaxed'>
              Select a note from the list or <span className='text-accent-primary font-bold'>create a new note</span> to begin.
            </p>
          </div>

          <div className='mt-10 flex items-center gap-2 opacity-30'>
            <div className='w-1 h-1 bg-text-tertiary rounded-full' />
            <div className='w-1 h-1 bg-text-tertiary rounded-full' />
            <div className='w-1 h-1 bg-text-tertiary rounded-full' />
          </div>
        </div>
      </div>
    )
  }

  if (showLockScreen) {
    return (
      <div className='flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden'>
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />
        <div className='relative z-10 flex flex-col items-center text-center px-8 animate-in fade-in zoom-in-95 duration-500'>
          <div className='w-24 h-24 bg-bg-secondary border border-border-primary rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl'>
            <Lock className='w-10 h-10 text-accent-primary' />
          </div>
          <div className='space-y-3 max-w-[390px]'>
            <h3 className='text-3xl font-black text-text-primary tracking-tight'>Locked Note</h3>
            <p className='text-[15px] text-text-tertiary leading-relaxed'>
              {lockMethod === 'password'
                ? 'This note is protected. Enter your note lock password to view it.'
                : authSupported
                  ? 'This note is protected. Use Touch ID or your login password to authenticate and view it.'
                  : "This note is locked and can't be opened on this device. Set up device authentication (Touch ID or a login password) in System Settings to view it."}
            </p>
          </div>
          {(lockMethod === 'password' || authSupported) && (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className='mt-8 flex items-center gap-2 px-6 py-3 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-sm hover:bg-accent-primary-hover transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Lock className='w-4 h-4' />
              {unlocking ? 'Authenticating…' : 'Unlock'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='flex-1 flex flex-col overflow-hidden bg-bg-primary relative min-w-0 hardware-accelerated'>
      <div className='absolute top-3 left-0 right-0 px-6 flex items-start justify-between z-50 gap-4'>
        <div className='flex-1 min-w-0 pointer-events-auto'>
          <div className='pb-2'>
            <FormattingToolbar editor={editorInstance} noteKey={selectedNoteKey} />
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto custom-scrollbar pt-16' onContextMenu={handleEditorContextMenu}>
        <div className='max-w-4xl mx-auto px-6 py-4 w-full min-h-full bg-bg-primary'>
          <input
            ref={titleRef}
            type='text'
            value={title}
            onChange={handleTitleChange}
            placeholder='Title'
            className='w-full text-4xl font-black mb-4 bg-transparent border-none outline-none resize-none select-text leading-tight text-text-primary tracking-tighter p-0'
            style={{ 
              fontSize: `${editorFontSize * 2}px`, 
              fontFamily: editorFontFamily 
            }}
          />
          <div className='flex-1'>
            <RichTextEditor
              key={selectedNoteKey}
              ref={richTextEditorRef}
              content={content}
              onChange={handleContentChange}
              placeholder='Start writing...'
              localDevice={localDevice}
            />
          </div>
        </div>
      </div>
      <div className='absolute bottom-6 right-8 pointer-events-none z-30'>
        <span className='text-[10px] font-bold text-text-secondary uppercase tracking-widest'>
          edited {formatRelativeDate(noteData?.updatedAt || noteData?.createdAt)}
        </span>
      </div>
    </div>
  )
}
