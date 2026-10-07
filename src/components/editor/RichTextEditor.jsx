import '../../styles/tiptap.css'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
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
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
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

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getEditorBaseKey, setEditorFocused } from '@pear-notes/core/store/slices/editorSlice.js'
import { getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getEditorFontSize, getFontFamily } from '@pear-notes/core/store/slices/settingsSlice.js'

import { clearEditorHistory } from '../../lib/editorHistory'
import { EmptyFirstLine } from '../../lib/emptyFirstLine'
import { FindInNote } from '../../lib/findInNote'
import { KeptSelection, keptSelectionRange } from '../../lib/keptSelection'
import { UploadCancelledError, uploadFileWithProgress } from '../../lib/noteUploadManager'
import { clearUploadQueue, enqueueUploads, nextUploadItemId } from '../../lib/uploadRegistry'
import { getFontClass, getFontFamilyValue } from '../../utils/fonts'

import AudioAttachment from './AudioAttachment'
import FileAttachment from './FileAttachment'
import ImageView from './ImageView'
import SelectionAiTools from './SelectionAiTools'

const RichTextEditor = forwardRef(
  ({ content, syncToken = 0, onChange, placeholder = 'Start writing...' }, ref) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const currentNoteKey = useSelector(getSelectedNote)
    const baseKey = useSelector(getEditorBaseKey)
    const fontFamily = useSelector(getFontFamily)
    const editorFontSize = useSelector(getEditorFontSize)
    const isUpdatingRef = useRef(false)
    const lastSyncTokenRef = useRef(-1)
    const historyNoteKeyRef = useRef(null)
    const lowlight = createLowlight(all)

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
            codeBlock: false
          }),
          EmptyFirstLine,
          FindInNote,
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
          KeptSelection
        ],
        content: content || '',
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
      [fontFamily, editorFontSize]
    )

    useImperativeHandle(
      ref,
      () => ({
        editor
      }),
      [editor]
    )

    useEffect(() => {
      if (!editor || content === undefined) return
      if (syncToken === lastSyncTokenRef.current) return
      lastSyncTokenRef.current = syncToken
      // Undo history belongs to one note. baseKey, not the selected key, says which note
      // this content came from - the selection changes before the note's data arrives.
      const isNoteSwitch = historyNoteKeyRef.current !== baseKey
      historyNoteKeyRef.current = baseKey
      const currentContent = editor.getHTML()
      if (content === currentContent) {
        if (isNoteSwitch) clearEditorHistory(editor)
        return
      }
      const isInitialLoad = currentContent === '<p></p>'
      isUpdatingRef.current = true
      const { from, to } = editor.state.selection
      editor.commands.setContent(content || '', { emitUpdate: false })
      const size = editor.state.doc.content.size
      if (!isInitialLoad) {
        editor.commands.setTextSelection({ from: Math.min(from, size), to: Math.min(to, size) })
      }
      isUpdatingRef.current = false
      if (isNoteSwitch) clearEditorHistory(editor)
    }, [content, syncToken, editor, baseKey])

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
            shouldShow={({ editor, state, from, to }) => {
              if (editor.isActive('table') || editor.isActive('codeBlock')) return false
              // A range kept for the AI tools has no live selection behind it,
              // but the menu is the only way back to those tools — hiding it
              // would force the user to select the same text again.
              const kept = keptSelectionRange(state)
              if (kept) return true
              return (
                from !== to &&
                !state.selection.empty &&
                state.doc.textBetween(from, to).trim().length > 0
              )
            }}
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
