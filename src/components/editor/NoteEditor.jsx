import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Lock } from 'lucide-react'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { ALL_NOTES_KEY, NOTE_TITLE_MAX_LENGTH } from '@pear-notes/core/constant.js'
import {
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  closeNoteHistory,
  getHistoryNoteKey,
  openNoteHistory
} from '@pear-notes/core/store/slices/activitySlice.js'
import {
  getEditorConflict,
  getEditorContent,
  getEditorContentText,
  getEditorInstance,
  getEditorSyncToken,
  getEditorTitle,
  setEditorContent,
  setEditorInstance,
  setEditorTitle
} from '@pear-notes/core/store/slices/editorSlice.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getNoteData, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getActivityLogEnabled,
  getEditorFontSize,
  getFontFamily,
  getLockMethod
} from '@pear-notes/core/store/slices/settingsSlice.js'
import { getSyncedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { useLocalAiFeatureReady } from '../../hooks/useLocalAiFeatureReady'
import { useLockedNoteProtection } from '../../hooks/useLockedNoteProtection'
import { copyToClipboard } from '../../lib/clipboard'
import { showContextMenu } from '../../lib/contextMenu'
import { isDeviceAuthSupported } from '../../lib/deviceAuth'
import { clearLocalAiSheetRequest, useLocalAiSheetRequest } from '../../lib/localAi/localAiRequests'
import {
  isNoteUnlocked,
  markNoteUnlocked,
  unlockNote,
  useNoteLockVersion
} from '../../lib/noteLock'
import { toggleNoteLock } from '../../lib/noteLockActions'
import { useNoteLockPassword } from '../../lib/noteLockPasswordContext'
import { getFontFamilyValue } from '../../utils/fonts'
import UploadProgressToast from '../common/UploadProgressToast'
import LocalAiSheetModal from '../modals/LocalAiSheetModal'

import AiToolsButton from './AiToolsButton'
import FormattingToolbar from './FormattingToolbar'
import NoteConflictBanner from './NoteConflictBanner'
import NoteHistoryPanel from './NoteHistoryPanel'
import RichTextEditor from './RichTextEditor'

const paragraphNode = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })

const bulletListNode = (items) => ({
  type: 'bulletList',
  content: items.map((item) => ({ type: 'listItem', content: [paragraphNode(item)] }))
})

const toLines = (text) =>
  String(text ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

export default function NoteEditor({ onUpdate, onDelete, onEditorReady }) {
  const { t } = useTranslation()
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
  const syncToken = useSelector(getEditorSyncToken)

  const titleRef = useRef(null)
  const richTextEditorRef = useRef(null)
  const folders = useSelector(getFolders)
  const syncedDevices = useSelector(getSyncedDevices)
  const localDevice = useMemo(() => syncedDevices.find((d) => d.isLocal), [syncedDevices])

  const activityEnabled = useSelector(getActivityLogEnabled)
  const historyNoteKey = useSelector(getHistoryNoteKey)
  const showHistory = !!historyNoteKey && historyNoteKey === selectedNoteKey

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

  const localAiRequest = useLocalAiSheetRequest()
  const editorConflict = useSelector(getEditorConflict)
  const hasNoteConflict = !!editorConflict && editorConflict.key === selectedNoteKey
  const summarizeReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  const translateReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.TRANSLATE_NOTES)

  useEffect(() => {
    clearLocalAiSheetRequest()
  }, [selectedNoteKey, showLockScreen])

  const insertImageCaption = (caption, imageSrc) => {
    const { doc } = editorInstance.state
    let insertAt = null
    if (imageSrc) {
      doc.descendants((node, pos) => {
        if (insertAt !== null) return false
        if (node.type.name === 'image' && node.attrs.src === imageSrc) {
          insertAt = pos + node.nodeSize
          return false
        }
      })
    }
    editorInstance
      .chain()
      .focus()
      .insertContentAt(insertAt ?? doc.content.size, {
        type: 'paragraph',
        content: [{ type: 'text', text: caption, marks: [{ type: 'italic' }] }]
      })
      .run()
  }

  const summaryNodes = (summary) => {
    if (!summary) return []
    const heading = (text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text, marks: [{ type: 'bold' }] }]
    })
    return [
      ...(summary.summary
        ? [
            heading(t('localAi.summary.title')),
            { type: 'paragraph', content: [{ type: 'text', text: summary.summary }] }
          ]
        : []),
      ...(summary.actionItems.length > 0
        ? [
            heading(t('localAi.summary.actionItems')),
            {
              type: 'bulletList',
              content: summary.actionItems.map((item) => ({
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }]
              }))
            }
          ]
        : [])
    ]
  }

  const insertTranscriptQuote = (
    paragraphs,
    attachmentUrl,
    summary,
    title = t('localAi.transcriptTitle'),
    position = null
  ) => {
    const { doc } = editorInstance.state
    let insertAt = null
    if (attachmentUrl) {
      doc.descendants((node, pos) => {
        if (insertAt !== null) return false
        const isAttachment =
          node.type.name === 'audioAttachment' || node.type.name === 'fileAttachment'
        const nodeUrl = node.attrs.url || node.attrs.audioData || node.attrs.fileData
        if (isAttachment && nodeUrl === attachmentUrl) {
          insertAt = pos + node.nodeSize
          return false
        }
      })
    }
    const quote = {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: title, marks: [{ type: 'bold' }] }]
        },
        ...paragraphs,
        ...summaryNodes(summary)
      ]
    }
    editorInstance
      .chain()
      .focus()
      .insertContentAt(insertAt ?? position ?? doc.content.size, quote)
      .run()
  }

  const insertForSelection = (text, mode, summary, meta, selection) => {
    const { doc } = editorInstance.state
    const size = doc.content.size
    const from = Math.min(selection.from, size)
    const to = Math.min(Math.max(selection.to, from), size)
    const $to = doc.resolve(to)
    const below = $to.depth > 0 ? $to.after(1) : size
    if (mode === 'summarizeNote') {
      if (!summary) return
      insertTranscriptQuote(
        summary.summary ? [paragraphNode(summary.summary)] : [],
        null,
        { summary: '', actionItems: summary.actionItems },
        t('localAi.summarizeNote.insertTitle'),
        below
      )
      return
    }
    if (mode === 'keyPoints') {
      const bullets = meta?.bullets ?? []
      if (bullets.length === 0) return
      insertTranscriptQuote(
        [bulletListNode(bullets)],
        null,
        null,
        t('localAi.keyPoints.insertTitle'),
        below
      )
      return
    }
    const lines = toLines(text)
    if (lines.length === 0) return
    const unchanged = doc.textBetween(from, to, '\n', ' ') === selection.text
    if (meta?.action === 'replace' && unchanged) {
      editorInstance
        .chain()
        .focus()
        .insertContentAt(
          { from, to },
          lines.length === 1 ? { type: 'text', text: lines[0] } : lines.map(paragraphNode)
        )
        .run()
      return
    }
    editorInstance.chain().focus().insertContentAt(below, lines.map(paragraphNode)).run()
  }

  const handleAttachLocalAiAudio = async (blob, durationSeconds) => {
    const noteKey = selectedNoteKey
    clearLocalAiSheetRequest()
    if (!noteKey) return
    try {
      const extension = blob.type.includes('ogg') ? 'ogg' : 'webm'
      const fileName = `Audio Recording ${new Date().toLocaleString()}.${extension}`
      const { link } = await backendApi.insertFile({
        key: noteKey,
        fileName,
        buffer: await blob.arrayBuffer()
      })
      if (!link || !editorInstance || editorInstance.isDestroyed) return
      editorInstance
        .chain()
        .focus()
        .insertContent([
          {
            type: 'audioAttachment',
            attrs: { audioData: null, url: link, duration: durationSeconds, fileName }
          },
          { type: 'paragraph' }
        ])
        .run()
    } catch (error) {
      console.error('Error uploading audio:', error)
    }
  }

  const handleInsertLocalAiText = (text, mode, summary, meta) => {
    const atCursor = mode === 'dictate' || localAiRequest?.insertAt === 'cursor'
    const attachmentUrl = localAiRequest?.attachmentUrl ?? null
    const selection = localAiRequest?.scope === 'selection' ? localAiRequest.selection : null
    clearLocalAiSheetRequest()
    if (!editorInstance || editorInstance.isDestroyed) return
    if (selection) {
      insertForSelection(text, mode, summary, meta, selection)
      return
    }
    if (mode === 'describe') {
      insertImageCaption(text.trim(), attachmentUrl)
      return
    }
    if (mode === 'suggestTitle') {
      const nextTitle = text.trim().slice(0, NOTE_TITLE_MAX_LENGTH)
      if (!nextTitle) return
      dispatch(setEditorTitle(nextTitle))
      onUpdate({
        key: selectedNoteKey,
        title: nextTitle,
        contentHtml: content,
        content: editorInstance.getText() || contentText
      })
      return
    }
    if (mode === 'summarizeNote') {
      if (!summary) return
      insertTranscriptQuote(
        summary.summary
          ? [{ type: 'paragraph', content: [{ type: 'text', text: summary.summary }] }]
          : [],
        null,
        { summary: '', actionItems: summary.actionItems },
        t('localAi.summarizeNote.insertTitle')
      )
      return
    }
    if (mode === 'keyPoints') {
      const bullets = meta?.bullets ?? []
      if (bullets.length === 0) return
      insertTranscriptQuote(
        [
          {
            type: 'bulletList',
            content: bullets.map((item) => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }]
            }))
          }
        ],
        null,
        null,
        t('localAi.keyPoints.insertTitle')
      )
      return
    }
    const paragraphs = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }))
    if (paragraphs.length === 0) return
    if (mode === 'translate') {
      const language =
        meta?.language === 'en'
          ? t('localAi.translate.english')
          : t(`settings.onDeviceAi.languages.${meta?.language}`)
      insertTranscriptQuote(
        paragraphs,
        null,
        null,
        t('localAi.translate.insertTitle', { language })
      )
      return
    }
    if (mode === 'transcribe') {
      insertTranscriptQuote(paragraphs, attachmentUrl, summary)
      return
    }
    editorInstance
      .chain()
      .focus(atCursor ? undefined : 'end')
      .insertContent(paragraphs)
      .run()
  }

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
      reason: t('noteCard.unlockReason'),
      lockReason: t('noteCard.lockReason'),
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
      onUpdate({
        key: selectedNoteKey,
        title: newTitle,
        contentHtml: content,
        content: currentText
      })
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
      dispatch(
        updateNote({
          key: selectedNoteKey,
          title,
          note: content,
          folderKey
        })
      )
    }
  }

  const handleCopy = () => {
    if (!noteData) return null
    const currentText = editorInstance?.getText() || contentText
    const safeTitle = title || t('noteEditor.untitled')
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
    await copyToClipboard(data.text, data.html)
  }

  const handleEditorContextMenu = async (e) => {
    e.preventDefault()
    const moveTargets = folders.filter(
      (f) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== noteData?.folderKey
    )
    const moveSubmenu =
      moveTargets.length > 0
        ? moveTargets.map((f) => ({ id: `move:${f.id}`, label: f.name }))
        : [{ label: t('noteEditor.contextMenu.noOtherLists'), enabled: false }]
    const result = await showContextMenu([
      { role: 'cut', label: t('noteEditor.contextMenu.cut') },
      { role: 'copy', label: t('noteEditor.contextMenu.copy') },
      { role: 'paste', label: t('noteEditor.contextMenu.paste') },
      { role: 'selectAll', label: t('noteEditor.contextMenu.selectAll') },
      { type: 'separator' },
      { label: t('noteEditor.contextMenu.moveTo'), submenu: moveSubmenu },
      { id: 'copyNote', label: t('noteEditor.contextMenu.copyNote') },
      ...(activityEnabled
        ? [{ id: 'history', label: t('noteEditor.contextMenu.noteHistory') }]
        : []),
      {
        id: 'togglePin',
        label: isPinned
          ? t('noteEditor.contextMenu.unpinNote')
          : t('noteEditor.contextMenu.pinNote')
      },
      {
        id: 'toggleLock',
        label: isLocked
          ? t('noteEditor.contextMenu.removeLock')
          : t('noteEditor.contextMenu.lockNote')
      },
      { type: 'separator' },
      { id: 'delete', label: t('noteEditor.contextMenu.delete') }
    ])
    if (!result) return
    if (result.startsWith('move:')) {
      handleMoveTo(result.slice(5))
    } else if (result === 'copyNote') {
      copyNoteToClipboard()
    } else if (result === 'history') {
      dispatch(openNoteHistory(selectedNoteKey))
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
            <h3 className='text-3xl font-black text-text-primary tracking-tight'>
              {t('noteEditor.emptyState.title')}
            </h3>
            <p className='text-base text-text-tertiary leading-relaxed'>
              {t('noteEditor.emptyState.description')}
            </p>
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
            <h3 className='text-3xl font-black text-text-primary tracking-tight'>
              {t('noteCard.lockedTitle')}
            </h3>
            <p className='text-base text-text-tertiary leading-relaxed'>
              {lockMethod === 'password'
                ? t('noteEditor.lock.passwordProtected')
                : authSupported
                  ? t('noteEditor.lock.authProtected')
                  : t('noteEditor.lock.unavailable')}
            </p>
          </div>
          {(lockMethod === 'password' || authSupported) && (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className='mt-8 flex items-center gap-2 px-6 py-3 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-sm hover:bg-accent-primary-hover transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Lock className='w-4 h-4' />
              {unlocking ? t('noteEditor.authenticating') : t('noteCard.unlock')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='flex-1 flex overflow-hidden min-w-0'>
      <div className='flex-1 flex flex-col overflow-hidden bg-bg-primary relative min-w-0 hardware-accelerated'>
        <div className='absolute top-3 left-0 right-0 px-6 flex items-start justify-between z-50 gap-4'>
          <div className='flex-1 min-w-0 pointer-events-auto'>
            <div className='pb-2'>
              <FormattingToolbar editor={editorInstance} noteKey={selectedNoteKey} />
            </div>
          </div>
        </div>

        <div
          className='flex-1 overflow-y-auto custom-scrollbar pt-16'
          onContextMenu={handleEditorContextMenu}
        >
          <div className='max-w-4xl px-6 py-4 w-full min-h-full bg-bg-primary'>
            <NoteConflictBanner noteKey={selectedNoteKey} />
            <input
              ref={titleRef}
              type='text'
              value={title}
              onChange={handleTitleChange}
              maxLength={NOTE_TITLE_MAX_LENGTH}
              placeholder={t('noteEditor.titlePlaceholder')}
              aria-label={t('noteEditor.titlePlaceholder')}
              className='w-full text-4xl font-black mb-4 bg-transparent border-none resize-none select-text leading-tight text-text-primary tracking-tighter p-0'
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
                syncToken={syncToken}
                onChange={handleContentChange}
                placeholder={t('noteEditor.placeholder')}
                localDevice={localDevice}
              />
            </div>
          </div>
        </div>
        <UploadProgressToast />

        {LOCAL_AI_ENABLED && localAiRequest && (
          <LocalAiSheetModal
            key={localAiRequest.id}
            request={localAiRequest}
            insertBlocked={hasNoteConflict}
            summaryAvailable={summarizeReady}
            onInsert={handleInsertLocalAiText}
            onAttachAudio={handleAttachLocalAiAudio}
            onClose={clearLocalAiSheetRequest}
          />
        )}

        <div className='absolute bottom-6 right-8 z-30 flex items-center gap-4'>
          {LOCAL_AI_ENABLED && (summarizeReady || translateReady) && (
            <AiToolsButton
              content={content}
              summarizeReady={summarizeReady}
              translateReady={translateReady}
            />
          )}
        </div>
      </div>

      {showHistory && (
        <NoteHistoryPanel
          noteKey={selectedNoteKey}
          noteTitle={title}
          onClose={() => dispatch(closeNoteHistory())}
        />
      )}
    </div>
  )
}
