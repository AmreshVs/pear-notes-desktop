import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'

import Image from '@tiptap/extension-image'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import FileAttachment from './FileAttachment'

import ImageView from './ImageView'
import AudioAttachment from './AudioAttachment'
import { 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Split,
  Table as TableIcon
} from 'lucide-react'
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import '../styles/tiptap.css'
import { backendApi } from '../backend/api'
import { useSelector } from 'react-redux'
import { getSelectedNote } from '../store/slices/notesSlice'

const RichTextEditor = forwardRef(
  ({ content, onChange, placeholder = 'Start writing...' }, ref) => {
    const currentNoteKey = useSelector(getSelectedNote)
    const isUpdatingRef = useRef(false)
    const lowlight = createLowlight(all)

    const editor = useEditor({
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
          codeBlock: false
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
                default: null,
              },
              height: {
                default: null,
              },
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
        AudioAttachment
      ],
      content: content || '',
      editorProps: {
        handlePaste: (view, event) => {
          const items = Array.from(event.clipboardData?.items || [])
          
          items.forEach(async (item) => {
            if (item.kind === 'file') {
              const file = item.getAsFile()
              if (!file) return

              // Upload file
              try {
                const buffer = await file.arrayBuffer()
                const { link } = await backendApi.insertFile({ 
                  key: currentNoteKey, 
                  fileName: file.name, 
                  buffer 
                })
                console.log({link})
                if (!link) return

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
                console.error('Error uploading file:', error)
              }
            }
          })
          
          // Return false to let default handler handle text
          return items.some(item => item.kind === 'file')
        },
        handleDrop: (view, event, slice, moved) => {
          if (moved) return false

          const files = Array.from(event.dataTransfer?.files || [])
          if (files.length === 0) return false

          event.preventDefault()

          files.forEach(async (file) => {
            try {
              // Upload file
              const buffer = await file.arrayBuffer()
              const { link } = await backendApi.insertFile({ 
                key: currentNoteKey, 
                fileName: file.name, 
                buffer 
              })

              if (!link) return

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
              console.error('Error uploading dropped file:', error)
            }
          })

          return true
        },
        attributes: {
          class: 'prose prose-invert max-w-none focus:outline-none',
          'data-placeholder': placeholder
        }
      },
      onUpdate: ({ editor }) => {
        if (isUpdatingRef.current) return
        const html = editor.getHTML()
        const text = editor.getText()
        onChange({ html, text })
      }
    })

    useImperativeHandle(
      ref,
      () => ({
        editor
      }),
      [editor]
    )

    useEffect(() => {
      if (editor && content !== undefined) {
        const currentContent = editor.getHTML()
        if (content !== currentContent) {
          isUpdatingRef.current = true
          editor.commands.setContent(content || '', false)
          setTimeout(() => {
            isUpdatingRef.current = false
          }, 0)
        }
      }
    }, [content, editor])

    if (!editor) {
      return null
    }

    return (
      <div className='ProseMirror-wrapper'>
        <EditorContent
          editor={editor}
          className='flex-1 font-sans text-lg leading-relaxed text-text-primary'
        />
        
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            shouldShow={({ editor }) => editor.isActive('table')}
            className='flex items-center gap-1 p-1 bg-bg-panel border border-border-secondary rounded-lg shadow-xl z-[60]'
          >
            <div className='flex items-center gap-1 border-r border-border-primary pr-1 mr-1'>
              <BubbleButton
                onClick={() => editor.chain().focus().addRowBefore().run()}
                title='Add Row Above'
              >
                <ChevronUp className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().addRowAfter().run()}
                title='Add Row Below'
              >
                <ChevronDown className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().deleteRow().run()}
                title='Delete Row'
                className='hover:bg-accent-danger/10 hover:text-accent-danger'
              >
                <Trash2 className='w-4 h-4' />
              </BubbleButton>
            </div>

            <div className='flex items-center gap-1 border-r border-border-primary pr-1 mr-1'>
              <BubbleButton
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                title='Add Column Before'
              >
                <ChevronLeft className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                title='Add Column After'
              >
                <ChevronRight className='w-4 h-4 text-text-secondary' />
              </BubbleButton>
              <BubbleButton
                onClick={() => editor.chain().focus().deleteColumn().run()}
                title='Delete Column'
                className='hover:bg-accent-danger/10 hover:text-accent-danger'
              >
                <Trash2 className='w-4 h-4' />
              </BubbleButton>
            </div>

            <BubbleButton
              onClick={() => editor.chain().focus().mergeCells().run()}
              title='Merge Cells'
            >
              <Split className='w-4 h-4 text-text-secondary' />
            </BubbleButton>
            
            <BubbleButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              title='Delete Table'
              className='hover:bg-accent-danger/10 hover:text-accent-danger'
            >
              <TableIcon className='w-4 h-4' />
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
