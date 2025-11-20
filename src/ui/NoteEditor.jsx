import { useState, useEffect, useRef, useMemo } from 'react'
import RichTextEditor from './RichTextEditor'
import FormattingToolbar from './FormattingToolbar'
import { getNoteData, getSelectedNote } from '../store/notesSlice'
import { useSelector } from 'react-redux'

export default function NoteEditor({ onUpdate, onEditorReady }) {
  const selectedNoteKey = useSelector(getSelectedNote)
  const rawNoteData = useSelector(getNoteData(selectedNoteKey))
  const noteData = useMemo(() => rawNoteData || {}, [rawNoteData])

  // Initialize state from noteData props
  const [title, setTitle] = useState(noteData?.title || '')
  const [content, setContent] = useState(noteData?.note || '')
  const [contentText, setContentText] = useState('')
  const [editorInstance, setEditorInstance] = useState(null)
  const titleRef = useRef(null)
  const richTextEditorRef = useRef(null)

  // Auto-focus title when new note is created
  useEffect(() => {
    if (noteData && !noteData?.title && !noteData?.note) {
      setTimeout(() => {
        titleRef.current?.focus()
      }, 100)
    }
  }, [noteData])

    // Expose editor to parent via callback and update local state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (richTextEditorRef.current?.editor) {
        const editor = richTextEditorRef.current.editor
        setEditorInstance(editor)
        onEditorReady?.(editor)
      } else if (!noteData) {
        // Clear editor when no note is selected
        setEditorInstance(null)
        onEditorReady?.(null)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [onEditorReady, noteData])

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (noteData) {
      onUpdate({ key: selectedNoteKey, title: newTitle, contentHtml: content, content: contentText })
    }
  }

  const handleContentChange = ({ html, text }) => {
    setContent(html)
    setContentText(text)
    if (noteData) {
      onUpdate({ key: selectedNoteKey, title, contentHtml: html, content: text })
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      return `Today at ${timeStr}`
    } else if (days === 1) {
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      return `Yesterday at ${timeStr}`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  // Extract plain text from HTML for word count
  const getPlainText = (html) => {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  const getWordCount = (text) => {
    if (!text) return 0
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }

  if (!noteData) {
    return (
      <div className='flex-1 flex items-center justify-center bg-bg-secondary'>
        <div className='text-center'>
          <div className='mb-4'>
            <svg
              className='w-16 h-16 mx-auto text-text-tertiary'
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
          <p className='text-lg font-medium text-text-primary mb-1'>No Note Selected</p>
          <p className='text-base text-text-tertiary'>
            Select a note from the sidebar or create a new one
          </p>
        </div>
      </div>
    )
  }

  const wordCount = getWordCount(getPlainText(content) || contentText)

  return (
    <div className='flex-1 flex flex-col overflow-hidden bg-bg-secondary shadow-sm'>
      {/* Status Bar - Premium Styling */}
      <div className='px-6 py-2.5 flex items-center justify-end border-b border-border-primary bg-gradient-to-b from-bg-primary to-bg-secondary'>
        <div className='flex items-center gap-2 text-xs text-text-tertiary'>
          <span>
            Last edited {formatDate(noteData?.updatedAt || noteData?.createdAt)} | {wordCount}{' '}
            words
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <div className='flex-1 overflow-y-auto'>
        <div className='max-w-4xl mx-auto px-8 py-8 w-full'>
          {/* Formatting Toolbar */}
          <FormattingToolbar editor={editorInstance} />
          <input
            ref={titleRef}
            type='text'
            value={title}
            onChange={handleTitleChange}
            placeholder='Title'
            className='w-full text-2xl font-bold mb-6 bg-transparent border-none outline-none resize-none select-text leading-tight font-system text-text-primary tracking-[-0.02em]'
          />
          <div className='min-h-[500px]'>
            <RichTextEditor
              ref={richTextEditorRef}
              content={content}
              onChange={handleContentChange}
              placeholder='Start writing...'
            />
          </div>
        </div>
      </div>

      {/* Bottom Status - Premium Styling */}
      <div className='px-6 py-2.5 flex items-center justify-end border-t border-border-primary bg-gradient-to-t from-bg-primary to-bg-secondary'>
        <div className='flex items-center gap-2 text-xs text-text-tertiary'>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
          <span>Synced</span>
        </div>
      </div>
    </div>
  )
}
