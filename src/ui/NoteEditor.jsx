import { useEffect, useRef, useMemo } from 'react'
import RichTextEditor from './RichTextEditor'
import FormattingToolbar from './FormattingToolbar'
import { getNoteData, getSelectedNote } from '../store/slices/notesSlice'
import {
  getEditorTitle,
  getEditorContent,
  getEditorContentText,
  getEditorInstance,
  setEditorTitle,
  setEditorContent,
  setEditorInstance
} from '../store/slices/editorSlice'
import { useSelector, useDispatch } from 'react-redux'
import NoteOptionsMenu from './NoteOptionsMenu'
import { getFolders } from '../store/slices/foldersSlice'
import { updateNote } from '../store/slices/notesSlice'

export default function NoteEditor({ onUpdate, onDelete, onEditorReady }) {
  const dispatch = useDispatch()
  const selectedNoteKey = useSelector(getSelectedNote)
  const rawNoteData = useSelector(getNoteData(selectedNoteKey))
  const noteData = useMemo(() => rawNoteData || {}, [rawNoteData])

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
    if (!noteData) return ''
    const currentText = editorInstance?.getText() || contentText
    return `${title || 'Untitled Note'}\n\n${currentText || ''}`
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

  return (
    <div className='flex-1 flex flex-col overflow-hidden bg-bg-primary relative'>
      <div className='absolute top-3 left-0 right-0 px-6 flex items-center justify-between z-30 pointer-events-none'>
        <div className='pointer-events-auto'>
          <FormattingToolbar editor={editorInstance} noteKey={selectedNoteKey} />
        </div>
        
        <div className='pointer-events-auto'>
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
        <div className='max-w-4xl mx-auto px-6 py-4 w-full min-h-full bg-bg-primary'>
          <input
            ref={titleRef}
            type='text'
            value={title}
            onChange={handleTitleChange}
            placeholder='Title'
            className='w-full text-4xl font-black mb-4 bg-transparent border-none outline-none resize-none select-text leading-tight font-system text-text-primary tracking-tighter'
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

      <div className='px-6 py-2.5 flex items-center justify-end border-t border-border-primary bg-bg-secondary'>
        <div className='flex items-center gap-2 text-xs text-text-tertiary'>
          <span>
            Last edited {formatDate(noteData?.updatedAt || noteData?.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
