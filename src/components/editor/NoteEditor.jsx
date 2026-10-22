import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Lock } from 'lucide-react'

import { ALL_NOTES_KEY, NOTE_TITLE_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import { imageDetailsContent } from '@pear-notes/core/store/services/imageDetails.js'
import {
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  buildImageDetailsTransaction,
  buildLineRewriteTransaction,
  buildMakeTasksTransaction,
  buildNoteEditsTransaction
} from '@pear-notes/core/store/services/localAiNoteEdits.js'
import {
  htmlToNoteText,
  isRewriteTask,
  keepsOriginalText
} from '@pear-notes/core/store/services/localAiPrompts.js'
import { splitNoteByHeadings } from '@pear-notes/core/store/services/noteSplit.js'
import {
  closeNoteHistory,
  getHistoryNoteKey,
  openNoteHistory
} from '@pear-notes/core/store/slices/activitySlice.js'
import {
  getEditorBaseKey,
  getEditorConflict,
  getEditorContent,
  getEditorContentText,
  getEditorInstance,
  getEditorSyncToken,
  getEditorTitle,
  setEditorContent,
  setEditorInstance,
  setEditorTitle,
  syncEditorWithNote
} from '@pear-notes/core/store/slices/editorSlice.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  closeRelatedNotes,
  getLocalAiIndexEnabled,
  getRelatedNotesKey,
  openRelatedNotes
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { selectAiSuggestionOn } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNoteData, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { splitNote, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getActivityLogEnabled,
  getEditorFontSize,
  getFontFamily,
  getLockMethod
} from '@pear-notes/core/store/slices/settingsSlice.js'
import { getOtherVaults, moveToVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { useAiToolsVisible } from '../../hooks/useAiFeatureGate'
import { useFindInNote } from '../../hooks/useFindInNote'
import { useLocalAiFeatureReady } from '../../hooks/useLocalAiFeatureReady'
import { useLockedNoteProtection } from '../../hooks/useLockedNoteProtection'
import { useSpellcheck } from '../../hooks/useSpellcheck'
import { copyToClipboard } from '../../lib/clipboard'
import { showContextMenu } from '../../lib/contextMenu'
import { isDeviceAuthSupported } from '../../lib/deviceAuth'
import { insertNoteFile } from '../../lib/fileManager'
import { clearLocalAiSheetRequest, useLocalAiSheetRequest } from '../../lib/localAi/localAiRequests'
import {
  isNoteSessionUnlocked,
  isNoteUnlocked,
  markNoteUnlocked,
  useNeedsOtherLockPassword,
  useNoteLockVersion
} from '../../lib/noteLock'
import { toggleNoteLock } from '../../lib/noteLockActions'
import { requestNoteLockPassword } from '../../lib/noteLockPasswordFlow'
import { unlockLockedNotes } from '../../lib/noteLockSession'
import { buildNoteMenu, GENERATE_MENU_PREFIX, MOVE_MENU_PREFIX } from '../../lib/noteMenu'
import {
  clearPendingNoteAction,
  getPendingNoteAction,
  subscribePendingNoteAction
} from '../../lib/pendingNoteAction'
import { canReadAloud, isReadingAloud, readAloud, stopReadingAloud } from '../../lib/readAloud'
import { confirmVaultMove, VAULT_MENU_PREFIX } from '../../lib/vaultNames'
import { getFontFamilyValue } from '../../utils/fonts'
import UploadProgressToast from '../common/UploadProgressToast'
import AskNoteModal from '../modals/AskNoteModal'
import GenerateNoteModal from '../modals/GenerateNoteModal'
import LocalAiSheetModal from '../modals/LocalAiSheetModal'

import AiToolsButton from './AiToolsButton'
import DictationBar from './DictationBar'
import FindBar from './FindBar'
import FormattingToolbar from './FormattingToolbar'
import InThisNotePanel from './InThisNotePanel'
import NoteBodyPlaceholder from './NoteBodyPlaceholder'
import NoteConflictBanner from './NoteConflictBanner'
import NoteHistoryPanel from './NoteHistoryPanel'
import NoteSuggestionChips from './NoteSuggestionChips'
import RichTextEditor from './RichTextEditor'
import ScrollJumpButton from './ScrollJumpButton'

const AUDIO_EXTENSION_BY_TYPE = [
  ['wav', 'wav'],
  ['ogg', 'ogg']
]

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

const SPELLING_WAIT_MS = 150
let spellingWaiter = null
window.electronBridge?.onSpellingContext?.((info) => {
  spellingWaiter?.(info)
  spellingWaiter = null
})

const nextSpellingContext = () =>
  new Promise((resolve) => {
    spellingWaiter = resolve
    setTimeout(() => {
      if (spellingWaiter === resolve) spellingWaiter = null
      resolve(null)
    }, SPELLING_WAIT_MS)
  })

export default function NoteEditor({ onUpdate, onDelete, onEditorReady }) {
  const { t } = useTranslation()
  const [spellcheck] = useSpellcheck()
  const [generateTask, setGenerateTask] = useState(null)
  const dispatch = useDispatch()
  const selectedNoteKey = useSelector(getSelectedNote)
  useEffect(() => () => stopReadingAloud(), [selectedNoteKey])
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
  const editorBaseKey = useSelector(getEditorBaseKey)
  const otherVaults = useSelector(getOtherVaults)
  const pendingNoteAction = useSyncExternalStore(subscribePendingNoteAction, getPendingNoteAction)

  const titleRef = useRef(null)
  const richTextEditorRef = useRef(null)
  const [editorScrollEl, setEditorScrollEl] = useState(null)
  const folders = useSelector(getFolders)

  const activityEnabled = useSelector(getActivityLogEnabled)
  const historyNoteKey = useSelector(getHistoryNoteKey)
  const showHistory = !!historyNoteKey && historyNoteKey === selectedNoteKey
  const relatedOn = useSelector((state) => selectAiSuggestionOn(state, AI_SUGGESTION.RELATED))
  const relatedEnabled = useSelector(getLocalAiIndexEnabled) && LOCAL_AI_ENABLED && relatedOn
  const tasksOn = useSelector((state) => selectAiSuggestionOn(state, AI_SUGGESTION.TASKS))
  const inThisNoteEnabled = relatedEnabled || (LOCAL_AI_ENABLED && tasksOn)
  const relatedNoteKey = useSelector(getRelatedNotesKey)

  useNoteLockVersion()
  const [unlocking, setUnlocking] = useState(false)
  const [authSupported, setAuthSupported] = useState(true)
  const lockMethod = useSelector(getLockMethod)
  const isLocked = noteData?.locked === true
  const isPinned = noteData?.pinned === true
  const noteUnlocked = isNoteUnlocked(selectedNoteKey)
  const needsOtherPassword = useNeedsOtherLockPassword(selectedNoteKey, noteData)
  const showLockScreen = isLocked && (!noteUnlocked || needsOtherPassword)
  const showInThisNote = inThisNoteEnabled && !!relatedNoteKey && !isLocked && !showHistory

  useEffect(() => {
    if (relatedNoteKey && selectedNoteKey && relatedNoteKey !== selectedNoteKey) {
      dispatch(openRelatedNotes(selectedNoteKey))
    }
  }, [dispatch, relatedNoteKey, selectedNoteKey])

  useLockedNoteProtection(isLocked && noteUnlocked)
  const find = useFindInNote({
    editor: editorInstance,
    noteKey: selectedNoteKey,
    enabled: !!editorInstance && !showLockScreen && !noteData?.bodyOmitted
  })

  const localAiRequest = useLocalAiSheetRequest()
  const editorConflict = useSelector(getEditorConflict)
  const hasNoteConflict = !!editorConflict && editorConflict.key === selectedNoteKey
  const summarizeReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  const aiToolsVisible = useAiToolsVisible()

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
      ...[
        ['decisions', summary.decisions],
        ['actionItems', summary.actionItems],
        ['openQuestions', summary.openQuestions]
      ].flatMap(([section, items]) =>
        items?.length > 0
          ? [
              heading(t(`localAi.summary.${section}`)),
              {
                type: 'bulletList',
                content: items.map((item) => ({
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }]
                }))
              }
            ]
          : []
      )
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

  const insertImageDetails = (details, imageSrc, { table, keepPhoto }) => {
    const made = buildImageDetailsTransaction(editorInstance.state, {
      src: imageSrc,
      blocks: imageDetailsContent(
        details,
        {
          types: t('localAi.details.types', { returnObjects: true }),
          ...t('localAi.details.fields', { returnObjects: true })
        },
        { table }
      ),
      keepImage: keepPhoto
    })
    if (made) editorInstance.view.dispatch(made.tr)
  }

  const handleMakeTasks = (texts) => {
    if (!editorInstance || editorInstance.isDestroyed || hasNoteConflict) return
    const made = buildMakeTasksTransaction(editorInstance.state, texts)
    if (made) editorInstance.view.dispatch(made.tr)
  }

  const appendOriginalQuote = (tr, to, original) => {
    const lines = toLines(original)
    if (lines.length === 0) return
    const $end = tr.doc.resolve(Math.min(tr.mapping.map(to), tr.doc.content.size))
    const below = $end.depth > 0 ? $end.after(1) : tr.doc.content.size
    const quote = {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: t('localAi.cleanUp.original'), marks: [{ type: 'bold' }] }
          ]
        },
        ...lines.map(paragraphNode)
      ]
    }
    tr.insert(below, editorInstance.schema.nodeFromJSON(quote))
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
        { ...summary, summary: '' },
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
    if (meta?.action === 'replace' && unchanged && (isRewriteTask(mode) || mode === 'ask')) {
      const rewrite = buildLineRewriteTransaction(
        editorInstance.state,
        { from, to },
        selection.text,
        text
      )
      if (rewrite) {
        if (rewrite.applied > 0) {
          if (keepsOriginalText(mode)) appendOriginalQuote(rewrite.tr, to, selection.text)
          editorInstance.view.dispatch(rewrite.tr)
        }
        editorInstance.commands.focus()
        return
      }
    }
    if (meta?.action === 'replace' && unchanged && !isRewriteTask(mode)) {
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
      const extension =
        AUDIO_EXTENSION_BY_TYPE.find(([marker]) => blob.type.includes(marker))?.[1] ?? 'webm'
      const fileName = `Audio Recording ${new Date().toLocaleString()}.${extension}`
      const { link } = await insertNoteFile({
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

  const isAskRequest = localAiRequest?.mode === 'ask'
  const isDictating = LOCAL_AI_ENABLED && localAiRequest?.mode === 'dictate' && !!editorInstance
  const askSelectionRef = useRef(null)
  const askNoteText = useMemo(
    () =>
      isAskRequest && editorInstance && !editorInstance.isDestroyed
        ? htmlToNoteText(editorInstance.getHTML())
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localAiRequest?.id]
  )

  useEffect(() => {
    askSelectionRef.current =
      isAskRequest && localAiRequest?.scope === 'selection' ? localAiRequest.selection : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localAiRequest?.id])

  const handleApplyAskEdits = ({ scope, edits, replaceText, lengthDelta }) => {
    if (!editorInstance || editorInstance.isDestroyed) return
    const selection = scope === 'selection' ? askSelectionRef.current : null
    if (replaceText !== null) {
      if (!selection) return
      insertForSelection(replaceText, 'ask', null, { action: 'replace' }, selection)
      askSelectionRef.current = { ...selection, text: replaceText, to: selection.to + lengthDelta }
      return
    }
    const { tr } = buildNoteEditsTransaction(
      editorInstance.state,
      edits,
      selection ? { from: selection.from, to: selection.to } : {}
    )
    if (!tr) return
    editorInstance.view.dispatch(tr)
    if (selection) askSelectionRef.current = { ...selection, to: selection.to + lengthDelta }
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
    if (mode === 'details' && meta?.details) {
      insertImageDetails(meta.details, attachmentUrl, meta)
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
        { ...summary, summary: '' },
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
      const ok =
        needsOtherPassword && isNoteSessionUnlocked()
          ? await requestNoteLockPassword('unlock', t('noteLockPassword.otherPasswordReason'))
          : await unlockLockedNotes(t('noteCard.unlockReason'))
      if (ok) markNoteUnlocked(selectedNoteKey)
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
      dispatch
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

  const handleMoveToVault = (vaultId) => {
    const vault = otherVaults.find((v) => v.id === vaultId)
    if (!vault || !confirmVaultMove({ vault, noteCount: 1, t })) return
    dispatch(moveToVault({ targetId: vaultId, noteKeys: [selectedNoteKey] }))
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
    if (!spellcheck) e.preventDefault()
    const spelling = spellcheck ? await nextSpellingContext() : null
    const spellingItems = spelling
      ? [
          ...(spelling.suggestions.length > 0
            ? spelling.suggestions.map((word) => ({ id: `spell:${word}`, label: word }))
            : [{ label: t('noteEditor.contextMenu.noSuggestions'), enabled: false }]),
          { id: 'spellAdd', label: t('noteEditor.contextMenu.addToDictionary') },
          { type: 'separator' }
        ]
      : []
    const result = await showContextMenu([
      ...spellingItems,
      { role: 'cut', label: t('noteEditor.contextMenu.cut') },
      { role: 'copy', label: t('noteEditor.contextMenu.copy') },
      { role: 'paste', label: t('noteEditor.contextMenu.paste') },
      { role: 'selectAll', label: t('noteEditor.contextMenu.selectAll') },
      { type: 'separator' },
      ...buildNoteMenu({
        t,
        moveFolders: folders.filter(
          (f) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== noteData?.folderKey
        ),
        otherVaults,
        pinned: isPinned,
        locked: isLocked,
        canSplit: splitNoteByHeadings(content, title).length >= 2,
        canRead: canReadAloud(),
        reading: isReadingAloud(),
        aiReady: summarizeReady,
        activityEnabled,
        relatedEnabled: inThisNoteEnabled
      })
    ])
    if (!result) return
    if (result.startsWith('spell:')) {
      window.electronBridge?.replaceMisspelling?.(result.slice(6))
    } else if (result === 'spellAdd') {
      window.electronBridge?.addToDictionary?.(spelling.word)
    } else {
      runNoteAction(result)
    }
  }

  const runNoteAction = (action) => {
    if (action.startsWith(MOVE_MENU_PREFIX)) {
      handleMoveTo(action.slice(MOVE_MENU_PREFIX.length))
    } else if (action.startsWith(VAULT_MENU_PREFIX)) {
      handleMoveToVault(action.slice(VAULT_MENU_PREFIX.length))
    } else if (action.startsWith(GENERATE_MENU_PREFIX)) {
      setGenerateTask(action.slice(GENERATE_MENU_PREFIX.length))
    } else if (action === 'readAloud') {
      const selected = window.getSelection()?.toString().trim()
      readAloud(selected || [title, editorInstance?.getText() ?? ''].filter(Boolean).join('. '))
    } else if (action === 'stopReading') {
      stopReadingAloud()
    } else if (action === 'splitNote') {
      const splitParts = splitNoteByHeadings(content, title)
      if (splitParts.length < 2) return
      const titles = splitParts.map((part) => part.title || t('noteCard.untitled')).join(', ')
      if (window.confirm(t('noteEditor.split.confirm', { count: splitParts.length, titles }))) {
        dispatch(splitNote({ key: selectedNoteKey }))
      }
    } else if (action === 'copyNote') {
      copyNoteToClipboard()
    } else if (action === 'history') {
      dispatch(closeRelatedNotes())
      dispatch(openNoteHistory(selectedNoteKey))
    } else if (action === 'related') {
      dispatch(closeNoteHistory())
      dispatch(openRelatedNotes(selectedNoteKey))
    } else if (action === 'togglePin') {
      handleTogglePin()
    } else if (action === 'toggleLock') {
      handleToggleLock()
    } else if (action === 'delete') {
      onDelete(selectedNoteKey)
    }
  }

  const editorReady =
    !!editorInstance &&
    !noteData.bodyOmitted &&
    !showLockScreen &&
    editorBaseKey === selectedNoteKey

  const bodyReady = !!noteData && !noteData.bodyOmitted && !showLockScreen
  useEffect(() => {
    if (!bodyReady || editorBaseKey === selectedNoteKey) return
    dispatch(syncEditorWithNote({ key: selectedNoteKey, data: noteData }))
  }, [bodyReady, editorBaseKey, selectedNoteKey, noteData, dispatch])

  useEffect(() => {
    if (!pendingNoteAction) return
    if (pendingNoteAction.key !== selectedNoteKey || showLockScreen) {
      clearPendingNoteAction()
      return
    }
    if (!editorReady) return
    clearPendingNoteAction()
    runNoteAction(pendingNoteAction.action)
  })

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

  if (noteData.bodyOmitted) {
    return (
      <NoteBodyPlaceholder
        key={selectedNoteKey}
        noteData={noteData}
        fontSize={editorFontSize}
        fontFamily={editorFontFamily}
      />
    )
  }

  return (
    <div className='flex-1 flex overflow-hidden min-w-0'>
      <div className='flex-1 flex flex-col overflow-hidden bg-bg-primary relative min-w-0 hardware-accelerated'>
        <div className='absolute top-3 left-0 right-0 px-6 flex items-start justify-between z-50 gap-4'>
          <div className='flex-1 min-w-0 pointer-events-auto'>
            <div className='pb-2'>
              {isDictating ? (
                <DictationBar
                  key={localAiRequest.id}
                  editor={editorInstance}
                  onDone={clearLocalAiSheetRequest}
                  onAttachAudio={handleAttachLocalAiAudio}
                />
              ) : (
                <FormattingToolbar editor={editorInstance} noteKey={selectedNoteKey} />
              )}
            </div>
          </div>
        </div>

        <div
          ref={setEditorScrollEl}
          className='flex-1 overflow-y-auto custom-scrollbar pt-16'
          onContextMenu={handleEditorContextMenu}
        >
          <div className='max-w-4xl px-6 py-4 w-full min-h-full bg-bg-primary'>
            {find.open && (
              <div className='sticky top-0 z-40 mb-3 flex justify-end'>
                <FindBar
                  query={find.query}
                  onQueryChange={find.setQuery}
                  count={find.count}
                  active={find.active}
                  inputRef={find.inputRef}
                  onNext={find.next}
                  onPrevious={find.previous}
                  onClose={find.close}
                  onEngage={find.keepFind}
                />
              </div>
            )}
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
            {LOCAL_AI_ENABLED && (
              <NoteSuggestionChips
                noteKey={selectedNoteKey}
                onAcceptTitle={(value) => handleTitleChange({ target: { value } })}
              />
            )}
            <div className='flex-1'>
              <RichTextEditor
                key={selectedNoteKey}
                ref={richTextEditorRef}
                content={content}
                syncToken={syncToken}
                onChange={handleContentChange}
                placeholder={t('noteEditor.placeholder')}
              />
            </div>
          </div>
        </div>
        <UploadProgressToast />
        {generateTask && (
          <GenerateNoteModal
            task={generateTask}
            noteKeys={[selectedNoteKey]}
            onClose={() => setGenerateTask(null)}
          />
        )}

        {LOCAL_AI_ENABLED && isAskRequest && (
          <AskNoteModal
            key={localAiRequest.id}
            noteKey={selectedNoteKey}
            selectionText={
              localAiRequest.scope === 'selection' ? (localAiRequest.selection?.text ?? '') : ''
            }
            noteText={askNoteText}
            insertBlocked={hasNoteConflict}
            onApplyEdits={handleApplyAskEdits}
            onClose={clearLocalAiSheetRequest}
          />
        )}

        {LOCAL_AI_ENABLED && localAiRequest && !isAskRequest && !isDictating && (
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
          <ScrollJumpButton scrollEl={editorScrollEl} resetKey={selectedNoteKey} />
          {aiToolsVisible && <AiToolsButton content={content} />}
        </div>
      </div>

      {showHistory && (
        <NoteHistoryPanel
          noteKey={selectedNoteKey}
          noteTitle={title}
          onClose={() => dispatch(closeNoteHistory())}
        />
      )}

      {showInThisNote && (
        <InThisNotePanel
          noteKey={selectedNoteKey}
          html={content}
          title={title}
          anchor={noteData?.updatedAt}
          showFindings={LOCAL_AI_ENABLED && tasksOn}
          showRelated={relatedEnabled}
          insertBlocked={hasNoteConflict}
          onMakeTasks={handleMakeTasks}
          onClose={() => dispatch(closeRelatedNotes())}
        />
      )}
    </div>
  )
}
