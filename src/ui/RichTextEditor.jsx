import { useEditor, EditorContent } from '@tiptap/react'
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
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import '../styles/tiptap.css'

const RichTextEditor = forwardRef(
  ({ content, onChange, placeholder = 'Start writing...' }, ref) => {
    const isUpdatingRef = useRef(false)

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
          strike: false
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
        })
      ],
      content: content || '',
      editorProps: {
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
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor
