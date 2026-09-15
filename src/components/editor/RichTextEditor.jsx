import '../../styles/tiptap.css'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { DOMParser as PMDOMParser } from '@tiptap/pm/model'
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { all, createLowlight } from 'lowlight'
import {
  Bold as BoldIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code as CodeIcon,
  Highlighter as HighlighterIcon,
  Italic as ItalicIcon,
  Rows3 as HeaderRowIcon,
  Split,
  SplitSquareHorizontal as SplitCellIcon,
  Strikethrough as StrikethroughIcon,
  Trash2,
  Underline as UnderlineIcon
} from 'lucide-react'
import { prosemirrorToYXmlFragment } from 'y-prosemirror'
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates
} from 'y-protocols/awareness'
import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  messageYjsUpdate,
  readSyncStep1,
  writeSyncStep1
} from 'y-protocols/sync'
import * as Y from 'yjs'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { COLLABORATION_ENABLED } from '@pear-notes/core/constant.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { setEditorFocused } from '@pear-notes/core/store/slices/editorSlice.js'
import { getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getEditorFontSize, getFontFamily } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getCollaboratorIdentity } from '@pear-notes/core/utils.js'

import { UploadCancelledError, uploadFileWithProgress } from '../../lib/noteUploadManager'
import { clearUploadQueue, enqueueUploads, nextUploadItemId } from '../../lib/uploadRegistry'
import { getFontClass, getFontFamilyValue } from '../../utils/fonts'

import AudioAttachment from './AudioAttachment'
import FileAttachment from './FileAttachment'
import ImageView from './ImageView'
import SelectionAiTools from './SelectionAiTools'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const SYNC_RETRY_INTERVAL_MS = 1500
const MAX_SYNC_RETRY_ATTEMPTS = 10
const GENESIS_CLIENT_ID = 0
const YJS_FRAGMENT = 'default'

function seedGenesisFromHtml(ydoc, schema, html) {
  const fragment = ydoc.getXmlFragment(YJS_FRAGMENT)
  if (fragment.length > 0) return
  if (!html) return
  const container = document.createElement('div')
  container.innerHTML = html
  const pmDoc = PMDOMParser.fromSchema(schema).parse(container)
  const seedDoc = new Y.Doc()
  seedDoc.clientID = GENESIS_CLIENT_ID
  prosemirrorToYXmlFragment(pmDoc, seedDoc.getXmlFragment(YJS_FRAGMENT))
  Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(seedDoc), 'seed')
}

const RichTextEditor = forwardRef(
  ({ content, syncToken = 0, onChange, placeholder = 'Start writing...', localDevice }, ref) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const currentNoteKey = useSelector(getSelectedNote)
    const fontFamily = useSelector(getFontFamily)
    const editorFontSize = useSelector(getEditorFontSize)
    const isUpdatingRef = useRef(false)
    const lastSyncTokenRef = useRef(-1)
    const hasReceivedSyncRef = useRef(false)
    const lowlight = createLowlight(all)

    const { ydoc, awareness } = useMemo(() => {
      if (!COLLABORATION_ENABLED) return { ydoc: null, awareness: null }
      const y = new Y.Doc()
      const a = new Awareness(y)
      return { ydoc: y, awareness: a }
    }, [])

    const collaborator = useMemo(
      () => getCollaboratorIdentity(localDevice, 'Desktop'),
      [localDevice]
    )

    const editorFontFamily = getFontFamilyValue(fontFamily)
    const editorFontClass = getFontClass(fontFamily)

    const editor = useEditor(
      {
        extensions: [
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3]
            },
            bulletList: {
              keepMarks: true,
              keepAttributes: false
            },
            orderedList: {
              keepMarks: true,
              keepAttributes: false
            },
            strike: false,
            underline: false,
            link: false,
            codeBlock: false,
            undoRedo: !COLLABORATION_ENABLED
          }),
          Underline,
          Strike,
          TaskList,
          TaskItem.configure({
            nested: true
          }),
          TextAlign.configure({
            types: ['heading', 'paragraph']
          }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: 'editor-link'
            }
          }),
          Highlight.configure({
            multicolor: true
          }),
          Subscript,
          Superscript,
          Placeholder.configure({
            placeholder
          }),
          Image.extend({
            addAttributes() {
              return {
                ...this.parent?.(),
                width: {
                  default: null
                },
                height: {
                  default: null
                }
              }
            },
            addNodeView() {
              return ReactNodeViewRenderer(ImageView)
            }
          }).configure({
            inline: false,
            allowBase64: true
          }),
          BubbleMenuExtension,
          Table.configure({
            resizable: true,
            lastColumnResizable: true,
            allowTableNodeSelection: true
          }),
          TableRow,
          TableHeader,
          TableCell,
          CodeBlockLowlight.configure({
            lowlight
          }),
          FileAttachment,
          AudioAttachment,
          ...(COLLABORATION_ENABLED
            ? [
                Collaboration.configure({
                  document: ydoc
                }),
                CollaborationCursor.configure({
                  provider: { awareness },
                  user: collaborator
                })
              ]
            : [])
        ],
        content: COLLABORATION_ENABLED ? undefined : content || '',
        editorProps: {
          handlePaste: (view, event) => {
            const items = Array.from(event.clipboardData?.items || [])

            const pastedFiles = items
              .filter((item) => item.kind === 'file')
              .map((item) => item.getAsFile())
              .filter(Boolean)
            const pastedQueue = pastedFiles.map((file) => ({
              id: nextUploadItemId(),
              fileName: file.name,
              file
            }))
            enqueueUploads(pastedQueue)

            void (async () => {
              for (const { id: itemId, file } of pastedQueue) {
                try {
                  const { link } = await uploadFileWithProgress({
                    noteKey: currentNoteKey,
                    file,
                    itemId
                  })
                  if (!link) continue

                  const { schema } = view.state

                  if (file.type.startsWith('image/')) {
                    const node = schema.nodes.image.create({ src: link })
                    const transaction = view.state.tr.replaceSelectionWith(node)
                    view.dispatch(transaction)
                  } else {
                    if (schema.nodes.fileAttachment) {
                      const node = schema.nodes.fileAttachment.create({
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        url: link
                      })
                      const transaction = view.state.tr.replaceSelectionWith(node)
                      view.dispatch(transaction)
                    }
                  }
                } catch (error) {
                  if (!(error instanceof UploadCancelledError))
                    console.error('Error uploading file:', error)
                }
              }
              clearUploadQueue()
            })()

            return pastedFiles.length > 0
          },
          handleDrop: (view, event, slice, moved) => {
            if (moved) return false

            const files = Array.from(event.dataTransfer?.files || [])
            if (files.length === 0) return false

            event.preventDefault()

            const droppedQueue = files.map((file) => ({
              id: nextUploadItemId(),
              fileName: file.name,
              file
            }))
            enqueueUploads(droppedQueue)

            void (async () => {
              for (const { id: itemId, file } of droppedQueue) {
                try {
                  const { link } = await uploadFileWithProgress({
                    noteKey: currentNoteKey,
                    file,
                    itemId
                  })

                  if (!link) continue

                  const { schema } = view.state

                  if (file.type.startsWith('image/')) {
                    const node = schema.nodes.image.create({ src: link })
                    const transaction = view.state.tr.replaceSelectionWith(node)
                    view.dispatch(transaction)
                  } else {
                    if (schema.nodes.fileAttachment) {
                      const node = schema.nodes.fileAttachment.create({
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        url: link
                      })
                      const transaction = view.state.tr.replaceSelectionWith(node)
                      view.dispatch(transaction)
                    }
                  }
                } catch (error) {
                  if (!(error instanceof UploadCancelledError))
                    console.error('Error uploading dropped file:', error)
                }
              }
              clearUploadQueue()
            })()

            return true
          },
          attributes: {
            class: `prose prose-invert max-w-none focus:outline-none ${editorFontClass}`,
            style: `font-size: ${editorFontSize}px; font-family: ${editorFontFamily};`,
            'data-placeholder': placeholder,
            spellcheck: 'false'
          },
          handleDOMEvents: {
            focus: () => {
              dispatch(setEditorFocused(true))
              return false
            },
            blur: () => {
              dispatch(setEditorFocused(false))
              return false
            }
          }
        },
        onUpdate: ({ editor }) => {
          if (isUpdatingRef.current) return
          const html = editor.getHTML()
          const text = editor.getText()
          onChange({ html, text })
        }
      },
      [fontFamily, editorFontSize, ydoc, awareness]
    )

    useEffect(() => {
      if (!COLLABORATION_ENABLED) return
      if (editor && !editor.isDestroyed) {
        editor.commands.updateUser(collaborator)
      }
    }, [editor, collaborator])

    useImperativeHandle(
      ref,
      () => ({
        editor
      }),
      [editor]
    )

    useEffect(() => {
      if (COLLABORATION_ENABLED || !editor || content === undefined) return
      if (syncToken === lastSyncTokenRef.current) return
      lastSyncTokenRef.current = syncToken
      const currentContent = editor.getHTML()
      if (content === currentContent) return
      const isInitialLoad = currentContent === '<p></p>'
      isUpdatingRef.current = true
      const { from, to } = editor.state.selection
      editor.commands.setContent(content || '', false)
      const size = editor.state.doc.content.size
      if (!isInitialLoad) {
        editor.commands.setTextSelection({ from: Math.min(from, size), to: Math.min(to, size) })
      }
      isUpdatingRef.current = false
    }, [content, syncToken, editor])

    useEffect(() => {
      if (!COLLABORATION_ENABLED || !editor || !ydoc) return
      seedGenesisFromHtml(ydoc, editor.schema, content)
    }, [editor, ydoc, content])

    useEffect(() => {
      if (!COLLABORATION_ENABLED || !editor || !ydoc || !currentNoteKey) return

      hasReceivedSyncRef.current = false

      let active = true
      let stream = null

      const sendEncoder = (encoder) => {
        if (encoding.length(encoder) === 0) return
        backendApi.broadcastYjsUpdate({
          noteId: currentNoteKey,
          data: encoding.toUint8Array(encoder)
        })
      }

      const handleDocUpdate = (update, origin) => {
        if (origin === 'remote' || origin === 'seed' || !active) return
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        encoding.writeVarUint(encoder, messageYjsUpdate)
        encoding.writeVarUint8Array(encoder, update)
        sendEncoder(encoder)
      }

      const handleAwarenessUpdate = ({ added, updated, removed }, origin) => {
        if (origin === 'remote' || !active) return
        const changedClients = added.concat(updated, removed)
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
        encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(awareness, changedClients))
        sendEncoder(encoder)
      }

      ydoc.on('update', handleDocUpdate)
      awareness.on('update', handleAwarenessUpdate)

      const sendSyncStep1 = () => {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        writeSyncStep1(encoder, ydoc)
        sendEncoder(encoder)
      }

      let syncRetryAttempts = 0
      let syncRetryInterval = setInterval(() => {
        if (hasReceivedSyncRef.current || syncRetryAttempts >= MAX_SYNC_RETRY_ATTEMPTS) {
          clearInterval(syncRetryInterval)
          syncRetryInterval = null
          return
        }
        syncRetryAttempts += 1
        sendSyncStep1()
      }, SYNC_RETRY_INTERVAL_MS)

      const setup = async () => {
        try {
          stream = await backendApi.subscribeYjsUpdate({ noteId: currentNoteKey })
          sendSyncStep1()

          for await (const msg of stream) {
            if (!active) break
            const data = msg.data?.data
            if (!data || data.byteLength === 0) continue

            const decoder = decoding.createDecoder(data)
            const messageType = decoding.readVarUint(decoder)

            if (messageType === MESSAGE_SYNC) {
              const syncMessageType = decoding.readVarUint(decoder)
              if (syncMessageType === messageYjsSyncStep1) {
                const replyEncoder = encoding.createEncoder()
                encoding.writeVarUint(replyEncoder, MESSAGE_SYNC)
                readSyncStep1(decoder, replyEncoder, ydoc)
                sendEncoder(replyEncoder)
              } else if (
                syncMessageType === messageYjsSyncStep2 ||
                syncMessageType === messageYjsUpdate
              ) {
                hasReceivedSyncRef.current = true
                Y.applyUpdate(ydoc, decoding.readVarUint8Array(decoder), 'remote')
              }
            } else if (messageType === MESSAGE_AWARENESS) {
              applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), 'remote')
            }
          }
        } catch (e) {
          console.error('subscribeYjsUpdate error', e)
        }
      }
      setup()

      return () => {
        active = false
        if (syncRetryInterval) clearInterval(syncRetryInterval)
        ydoc.off('update', handleDocUpdate)
        awareness.off('update', handleAwarenessUpdate)
        removeAwarenessStates(awareness, [awareness.clientID], 'unmount')
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy()
        }
      }
    }, [currentNoteKey, editor, ydoc, awareness])

    if (!editor) {
      return null
    }

    return (
      <div className='ProseMirror-wrapper'>
        <EditorContent
          editor={editor}
          className='flex-1 leading-relaxed text-text-primary transition-all duration-300'
        />

        {editor && (
          <BubbleMenu
            editor={editor}
            pluginKey='textSelectionMenu'
            tippyOptions={{ duration: 100 }}
            shouldShow={({ editor, state, from, to }) =>
              from !== to &&
              !state.selection.empty &&
              !editor.isActive('table') &&
              !editor.isActive('codeBlock') &&
              state.doc.textBetween(from, to).trim().length > 0
            }
            className='flex items-center gap-0.5 p-1 bg-bg-panel border border-border-secondary rounded-lg shadow-xl z-[60]'
          >
            <BubbleButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              title={t('formatting.bold')}
            >
              <BoldIcon className='w-4 h-4 text-text-secondary' strokeWidth={2.5} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title={t('formatting.italic')}
            >
              <ItalicIcon className='w-4 h-4 text-text-secondary' strokeWidth={2.5} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title={t('formatting.underline')}
            >
              <UnderlineIcon className='w-4 h-4 text-text-secondary' strokeWidth={2.5} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title={t('formatting.strikethrough')}
            >
              <StrikethroughIcon className='w-4 h-4 text-text-secondary' strokeWidth={2.5} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              title={t('formatting.highlight')}
            >
              <HighlighterIcon className='w-4 h-4 text-text-secondary' strokeWidth={2.5} />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              title={t('formatting.types.monospaced')}
            >
              <CodeIcon className='w-4 h-4 text-text-secondary' strokeWidth={2.5} />
            </BubbleButton>
            {LOCAL_AI_ENABLED && <SelectionAiTools editor={editor} />}
          </BubbleMenu>
        )}

        {editor && (
          <BubbleMenu
            editor={editor}
            pluginKey='tableMenu'
            tippyOptions={{ duration: 100 }}
            shouldShow={({ editor }) => editor.isActive('table')}
            className='flex items-center gap-1 p-1 bg-bg-panel border border-border-secondary rounded-lg shadow-xl z-[60]'
          >
            <div className='flex items-center gap-1 border-r border-border-primary pr-1 mr-1'>
              <BubbleButton
                onClick={() => editor.chain().focus().addRowBefore().run()}
                title={t('editor.table.addRowAbove')}
              >
                <ChevronUp className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().addRowAfter().run()}
                title={t('editor.table.addRowBelow')}
              >
                <ChevronDown className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().deleteRow().run()}
                title={t('editor.table.deleteRow')}
                className='hover:bg-accent-danger/10 hover:text-accent-danger'
              >
                <Trash2 className='w-4 h-4' />
              </BubbleButton>
            </div>

            <div className='flex items-center gap-1 border-r border-border-primary pr-1 mr-1'>
              <BubbleButton
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                title={t('editor.table.addColumnBefore')}
              >
                <ChevronLeft className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                title={t('editor.table.addColumnAfter')}
              >
                <ChevronRight className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().deleteColumn().run()}
                title={t('editor.table.deleteColumn')}
                className='hover:bg-accent-danger/10 hover:text-accent-danger'
              >
                <Trash2 className='w-4 h-4' />
              </BubbleButton>
            </div>

            <BubbleButton
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              title={t('editor.table.toggleHeaderRow')}
            >
              <HeaderRowIcon className='w-4 h-4 text-text-secondary' />
            </BubbleButton>

            <BubbleButton
              onClick={() => editor.chain().focus().mergeCells().run()}
              title={t('editor.table.mergeCells')}
            >
              <Split className='w-4 h-4 text-text-secondary' />
            </BubbleButton>

            <BubbleButton
              onClick={() => editor.chain().focus().splitCell().run()}
              title={t('editor.table.splitCell')}
            >
              <SplitCellIcon className='w-4 h-4 text-text-secondary' />
            </BubbleButton>

            <BubbleButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              title={t('editor.table.deleteTable')}
              className='hover:bg-accent-danger/10 text-accent-danger'
            >
              <Trash2 className='w-4 h-4' />
            </BubbleButton>
          </BubbleMenu>
        )}
      </div>
    )
  }
)

const BubbleButton = ({ onClick, title, children, className = '' }) => (
  <button
    type='button'
    onClick={onClick}
    className={`p-1.5 rounded-md hover:bg-bg-panel-tertiary transition-all flex items-center justify-center ${className}`}
    title={title}
  >
    {children}
  </button>
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor
