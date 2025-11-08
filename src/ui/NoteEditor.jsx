import { useState, useEffect, useRef } from 'react'
import RichTextEditor from './RichTextEditor'

export default function NoteEditor({ note, onUpdate, onDelete, onEditorReady }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentText, setContentText] = useState('')
  const titleRef = useRef(null)
  const richTextEditorRef = useRef(null)

  useEffect(() => {
    if (note) {
      setTitle(note.value?.title || '')
      // Support both HTML (rich text) and plain text (legacy)
      setContent(note.value?.contentHtml || note.value?.content || '')
      setContentText(note.value?.content || '')
    } else {
      setTitle('')
      setContent('')
      setContentText('')
    }
  }, [note])

  // Auto-focus title when new note is created
  useEffect(() => {
    if (note && !note.value?.title && !note.value?.content && !note.value?.contentHtml) {
      setTimeout(() => {
        titleRef.current?.focus()
      }, 100)
    }
  }, [note])

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (note) {
      onUpdate({ key: note.key, title: newTitle, contentHtml: content, content: contentText })
    }
  }

  const handleContentChange = ({ html, text }) => {
    setContent(html)
    setContentText(text)
    if (note) {
      onUpdate({ key: note.key, title, contentHtml: html, content: text })
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
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
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length
  }

  if (!note) {
    return (
      <div className='flex-1 flex items-center justify-center bg-secondary'>
        <div className='text-center'>
          <div className='mb-4'>
            <svg
              className='w-16 h-16 mx-auto text-tertiary'
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
          <p className='text-lg font-medium text-primary mb-1'>No Note Selected</p>
          <p className='text-base text-tertiary'>
            Select a note from the sidebar or create a new one
          </p>
        </div>
      </div>
    )
  }

  const wordCount = getWordCount(getPlainText(content) || contentText)

  // Expose editor to parent via callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (richTextEditorRef.current?.editor) {
        onEditorReady?.(richTextEditorRef.current.editor)
      } else if (!note) {
        // Clear editor when no note is selected
        onEditorReady?.(null)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [onEditorReady, note])

  return (
    <div className='flex-1 flex flex-col overflow-hidden' style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Status Bar */}
      <div className='px-6 py-2 flex items-center justify-end' style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div className='flex items-center gap-2 text-xs' style={{ color: 'var(--text-tertiary)' }}>
          <span>
            Last edited {formatDate(note.value?.updatedAt || note.value?.createdAt)} | {wordCount}{' '}
            words
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <div className='flex-1 overflow-y-auto'>
        <div className='max-w-4xl mx-auto px-8 py-8 w-full'>
          <input
            ref={titleRef}
            type='text'
            value={title}
            onChange={handleTitleChange}
            placeholder='Title'
            className='w-full text-2xl font-bold mb-4 bg-transparent border-none outline-none resize-none select-text leading-tight'
            style={{
              fontFamily: 'var(--font-family-system)',
              color: 'var(--text-primary)'
            }}
          />
          <div style={{ minHeight: '500px' }}>
            <RichTextEditor
              ref={richTextEditorRef}
              content={content}
              onChange={handleContentChange}
              placeholder='Start writing...'
            />
          </div>
        </div>
      </div>

              {/* Bottom Status */}
              <div className='px-6 py-2 flex items-center justify-end' style={{ borderTop: '1px solid var(--border-primary)' }}>
                <div className='flex items-center gap-2 text-xs' style={{ color: 'var(--text-tertiary)' }}>
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
          <span>Synced</span>
        </div>
      </div>
    </div>
  )
}
