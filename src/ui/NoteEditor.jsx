import { useEffect, useRef, useMemo } from 'react'
import RichTextEditor from './RichTextEditor'
import FormattingToolbar from './FormattingToolbar'
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
import NoteOptionsMenu from './NoteOptionsMenu'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getFontFamily, getEditorFontSize } from '@pear-notes/core/store/slices/settingsSlice.js'

const getFontFamilyValue = (family) => {
  switch (family) {
    case 'Serif': return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
    case 'Mono': return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    case 'System': return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    case 'Inter': default: return '"Inter", system-ui, -apple-system, sans-serif'
  }
}



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
  const optionsButtonRef = useRef(null)
  const folders = useSelector(getFolders)

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
    
    // Construct HTML with title
    // Determine title element based on size - using h1 to be standard
    const titleHtml = `<h1 style="font-size: 2em; font-weight: 800; margin-bottom: 0.5em;">${safeTitle}</h1>`
    const fullHtml = `${titleHtml}${content || ''}`
    
    return {
      text: `${safeTitle}\n\n${currentText || ''}`,
      html: fullHtml
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

  if (!noteData || !selectedNoteKey) {
    return (
      <div className='flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden'>
        {/* Subtle background glow */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />
        
        <div className='relative z-10 flex flex-col items-center text-center px-8 animate-in fade-in zoom-in-95 duration-700'>
          <div className='w-24 h-24 bg-bg-panel border border-white/[0.05] rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative group'>
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

  return (
    <div className='flex-1 flex flex-col overflow-hidden bg-bg-primary relative min-w-0 hardware-accelerated'>
      <div className='absolute top-3 left-0 right-0 px-6 flex items-start justify-between z-50 gap-4'>
        <div className='flex-1 min-w-0 max-w-[calc(100%-60px)] pointer-events-auto'>
          <div className='pb-2'>
            <FormattingToolbar editor={editorInstance} noteKey={selectedNoteKey} />
          </div>
        </div>
        
        <div className='flex-shrink-0 pointer-events-auto flex items-center gap-4'>
          <NoteOptionsMenu 
            buttonRef={optionsButtonRef}
            folders={folders}
            currentFolderKey={noteData?.folderKey}
            onMoveTo={handleMoveTo}
            onCopy={handleCopy}
            onDelete={() => onDelete(selectedNoteKey)}
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto custom-scrollbar pt-16'>
        <div className='max-w-4xl px-6 py-4 w-full min-h-full bg-bg-primary'>
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
              ref={richTextEditorRef}
              content={content}
              onChange={handleContentChange}
              placeholder='Start writing...'
            />
          </div>
        </div>
      </div>
      <div className='absolute bottom-6 right-8 pointer-events-none z-30 opacity-40 hover:opacity-100 transition-opacity duration-500'>
        <span className='text-[10px] font-bold text-text-tertiary uppercase tracking-widest'>
          edited {formatDate(noteData?.updatedAt || noteData?.createdAt)}
        </span>
      </div>
    </div>
  )
}
