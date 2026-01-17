import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Square,
  Link2,
  Highlighter,
  Undo,
  Redo,
  Table as TableIcon,
  Code as CodeIcon,
  Paperclip
} from 'lucide-react'
import { useState, useEffect, useRef, forwardRef } from 'react'
import { backendApi } from '../backend/api'
import LinkModal from './LinkModal'
import AttachmentMenu from './AttachmentMenu'
import AudioRecorderModal from './AudioRecorderModal'

export default function FormattingToolbar({ editor, noteKey }) {
  const [editorState, setEditorState] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isHighlight: false,
    isBulletList: false,
    isOrderedList: false,
    isTaskList: false,
    isCodeBlock: false,
    isCode: false,
    isBlockquote: false,
    isLink: false,
    headingLevel: 0,
    textAlign: 'left',
    canUndo: false,
    canRedo: false
  })
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const formatMenuRef = useRef(null)
  const attachmentButtonRef = useRef(null)

  // Update editor state when editor changes
  useEffect(() => {
    if (!editor) return

    const updateState = () => {
      const headingLevel = editor.isActive('heading', { level: 1 })
        ? 1
        : editor.isActive('heading', { level: 2 })
          ? 2
          : editor.isActive('heading', { level: 3 })
            ? 3
            : 0

      const textAlign = editor.isActive({ textAlign: 'left' })
        ? 'left'
        : editor.isActive({ textAlign: 'center' })
          ? 'center'
          : editor.isActive({ textAlign: 'right' })
            ? 'right'
            : editor.isActive({ textAlign: 'justify' })
              ? 'justify'
              : 'left'

      setEditorState({
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isUnderline: editor.isActive('underline'),
        isStrike: editor.isActive('strike'),
        isHighlight: editor.isActive('highlight'),
        isBulletList: editor.isActive('bulletList'),
        isOrderedList: editor.isActive('orderedList'),
        isTaskList: editor.isActive('taskList'),
        isCodeBlock: editor.isActive('codeBlock'),
        isCode: editor.isActive('code'),
        isBlockquote: editor.isActive('blockquote'),
        isLink: editor.isActive('link'),
        headingLevel,
        textAlign,
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo()
      })
    }

    updateState()

    editor.on('selectionUpdate', updateState)
    editor.on('transaction', updateState)
    editor.on('update', updateState)

    return () => {
      editor.off('selectionUpdate', updateState)
      editor.off('transaction', updateState)
      editor.off('update', updateState)
    }
  }, [editor])

  // Close format menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(event.target)) {
        setShowFormatMenu(false)
      }
    }
    if (showFormatMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFormatMenu])

  const handleSetLink = ({ url, text }) => {
    if (!editor) return

    if (url) {
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to)

      if (selectedText && text) {
        // Replace selected text with link
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      } else if (selectedText) {
        // Wrap selected text in link
        editor.chain().focus().setLink({ href: url }).run()
      } else if (text) {
        // Insert new link with text
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      } else {
        // Just set link on current selection
        editor.chain().focus().setLink({ href: url }).run()
      }
    } else {
      // Remove link
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkModal(false)
  }


  const handleHeadingClick = (level) => {
    if (!editor) return
    if (level === 0) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level }).run()
    }
    setShowFormatMenu(false)
  }

  const getCurrentLink = () => {
    if (!editor) return { url: '', text: '' }
    const attrs = editor.getAttributes('link')
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    )
    return {
      url: attrs.href || '',
      text: selectedText || attrs.href || ''
    }
  }

  const handleInsertImage = async (file) => {
    if (!editor || !file) return
    try {
      const buffer = await file.arrayBuffer()
      const { link } = await backendApi.insertFile({ 
        key: noteKey, 
        fileName: file.name, 
        buffer 
      })
      if (link) {
        editor.chain().focus().insertContent([
          { type: 'image', attrs: { src: link } },
          { type: 'paragraph' }
        ]).run()
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }

  const handleInsertFile = async (file) => {
    if (!editor || !file) return
    try {
      const buffer = await file.arrayBuffer()
      const { link } = await backendApi.insertFile({ 
        key: noteKey, 
        fileName: file.name, 
        buffer 
      })

      if (link) {
        editor.chain().focus().insertContent([
          {
            type: 'fileAttachment',
            attrs: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              url: link
            }
          },
          { type: 'paragraph' }
        ]).run()
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const handleInsertAudio = async ({ data, duration }) => {
    if (!editor) return
    try {
      // Data is base64 data URI from AudioRecorderModal
      const response = await fetch(data)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      const fileName = `Audio Recording ${new Date().toLocaleString()}.webm`

      const { link } = await backendApi.insertFile({ 
        key: noteKey, 
        fileName,
        buffer 
      })

      if (link) {
        editor.chain().focus().insertContent([
          {
            type: 'audioAttachment',
            attrs: {
              audioData: null,
              url: link,
              duration: duration
            }
          },
          { type: 'paragraph' }
        ]).run()
      }
    } catch (error) {
      console.error('Error uploading audio:', error)
    }
  }

  if (!editor) {
    return null
  }

  return (
    <>
      <div className='flex items-center gap-1 sm:gap-1 px-1.5 py-1 rounded-lg bg-bg-tertiary border border-border-primary shadow-sm min-h-[34px] w-fit relative z-20'>
        {/* Formatting Menu Button */}
        <div className='relative' ref={formatMenuRef}>
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
              showFormatMenu || editorState.headingLevel > 0 || editorState.isBold || editorState.isItalic 
                ? 'bg-accent-primary text-white' 
                : 'text-text-secondary hover:bg-bg-secondary'
            }`}
            title='Formatting'
          >
            <span className='font-serif text-[15px] font-bold tracking-tight'>Aa</span>
          </button>

          {showFormatMenu && (
            <div className='absolute top-full left-0 mt-2 rounded-lg shadow-xl z-50 bg-bg-panel border border-border-secondary min-w-[260px] overflow-hidden'>
              {/* Header: Row of formatting tools */}
              <div className='flex items-center justify-between p-1.5 border-b border-border-secondary bg-bg-panel-secondary/50'>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editorState.isBold}
                  title='Bold'
                >
                  <Bold className='w-4 h-4' />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editorState.isItalic}
                  title='Italic'
                >
                  <Italic className='w-4 h-4' />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  isActive={editorState.isUnderline}
                  title='Underline'
                >
                  <Underline className='w-4 h-4' />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  isActive={editorState.isStrike}
                  title='Strikethrough'
                >
                  <Strikethrough className='w-4 h-4' />
                </MenuButton>
                <div className='w-px h-4 bg-border-secondary mx-1' />
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleHighlight().run()}
                  isActive={editorState.isHighlight}
                  title='Highlight'
                >
                  <div className='relative'>
                    <Highlighter className='w-4 h-4' />
                    <div className='absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent-primary' />
                  </div>
                </MenuButton>
              </div>

              {/* List: Text styles and more */}
              <div className='p-1.5 max-h-[400px] overflow-y-auto custom-scrollbar'>
                <ListButton
                  onClick={() => handleHeadingClick(1)}
                  isActive={editorState.headingLevel === 1}
                  label='Title'
                />
                <ListButton
                  onClick={() => handleHeadingClick(2)}
                  isActive={editorState.headingLevel === 2}
                  label='Heading'
                />
                <ListButton
                  onClick={() => handleHeadingClick(3)}
                  isActive={editorState.headingLevel === 3}
                  label='Subheading'
                />
                <ListButton
                  onClick={() => handleHeadingClick(0)}
                  isActive={editorState.headingLevel === 0 && !editorState.isCodeBlock && !editorState.isCode}
                  label='Body'
                  showCheck={editorState.headingLevel === 0 && !editorState.isCodeBlock && !editorState.isCode}
                />
                <ListButton
                  onClick={() => editor?.chain().focus().toggleCode().run()}
                  isActive={editorState.isCode}
                  label='Monostyled'
                />
                
                <div className='h-px bg-border-secondary my-1.5 mx-1' />
                
                <ListButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editorState.isBulletList}
                  label='Bulleted List'
                  icon={<div className='w-1.5 h-1.5 rounded-full bg-text-tertiary mr-3 ml-1' />}
                />
                <ListButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editorState.isOrderedList}
                  label='Numbered List'
                  icon={<span className='text-xs font-bold text-text-tertiary mr-3 ml-0.5'>1.</span>}
                />

                <div className='h-px bg-border-secondary my-1.5 mx-1' />

                <ListButton
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  isActive={editorState.isBlockquote}
                  label='Block Quote'
                  icon={<div className='w-1 h-4 bg-border-tertiary rounded-full mr-3.5 ml-1' />}
                />

                <div className='h-px bg-border-secondary my-1.5 mx-1' />
              </div>
            </div>
          )}
        </div>

        <div className='w-px h-6 bg-border-primary mx-1' />

        {/* Code Block Shortcut */}
        <Button
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          isActive={editorState.isCodeBlock}
          title='Code Block'
          className='w-8 h-8'
        >
          <CodeIcon className='w-4 h-4' />
        </Button>

        <div className='w-px h-6 bg-border-primary mx-1' />

        {/* Task List Shortcut */}
        <Button
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          isActive={editorState.isTaskList}
          title='Checklist'
          className='w-8 h-8'
        >
          <Square className='w-4 h-4' />
        </Button>

        {/* Link Shortcut */}
        <Button
          onClick={() => setShowLinkModal(true)}
          isActive={editorState.isLink}
          title='Link'
          className='w-8 h-8'
        >
          <Link2 className='w-4 h-4' />
        </Button>

        {/* Table Button */}
        <Button
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title='Insert Table'
          className='w-8 h-8'
        >
          <TableIcon className='w-4 h-4' />
        </Button>

        {/* Attachment Button */}
        <Button
          ref={attachmentButtonRef}
          onClick={() => setShowAttachmentMenu(true)}
          title='Attachments'
          className='w-8 h-8'
        >
          <Paperclip className='w-4 h-4' />
        </Button>

        {/* Undo/Redo - Subtle */}
        <div className='flex items-center gap-0.5 ml-1 mr-0.5'>
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editorState.canUndo}
            className='p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed'
            title='Undo'
          >
            <Undo className='w-4 h-4' />
          </button>
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editorState.canRedo}
            className='p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed'
            title='Redo'
          >
            <Redo className='w-4 h-4' />
          </button>
        </div>
      </div>

      {showLinkModal && (
        <LinkModal
          onClose={() => setShowLinkModal(false)}
          onSetLink={handleSetLink}
          currentUrl={getCurrentLink().url}
          currentText={getCurrentLink().text}
        />
      )}
      {showAttachmentMenu && (
        <AttachmentMenu
          onClose={() => setShowAttachmentMenu(false)}
          onInsertImage={handleInsertImage}
          onInsertFile={handleInsertFile}
          onRecordAudio={() => setShowAudioRecorder(true)}
          buttonRef={attachmentButtonRef}
        />
      )}
      {showAudioRecorder && (
        <AudioRecorderModal
          onClose={() => setShowAudioRecorder(false)}
          onSaveAudio={handleInsertAudio}
        />
      )}
    </>
  )
}

const Button = forwardRef(({ onClick, isActive, disabled, title, children, className = '' }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className={`p-1 rounded-md transition-all flex-shrink-0 flex items-center justify-center ${
      isActive
        ? 'bg-accent-primary text-white shadow-sm'
        : disabled
          ? 'text-text-tertiary opacity-50 cursor-not-allowed'
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
    } ${className}`}
    title={title}
    disabled={disabled}
  >
    {children}
  </button>
))
Button.displayName = 'Button'

const MenuButton = ({ onClick, isActive, title, children }) => (
  <button
    onClick={onClick}
    className={`p-1 rounded-md transition-all flex items-center justify-center ${
      isActive
        ? 'bg-accent-primary text-white shadow-sm'
        : 'text-text-secondary hover:bg-bg-panel-tertiary hover:text-text-primary'
    }`}
    title={title}
  >
    {children}
  </button>
)

const ListButton = ({ onClick, isActive, label, icon, showCheck }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-all hover:bg-bg-panel-tertiary group mb-0.5 ${
      isActive ? 'text-text-primary bg-bg-panel-tertiary/50' : 'text-text-secondary'
    }`}
  >
    <div className='flex items-center'>
      {icon}
      <span className={`text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </div>
    {(isActive || showCheck) && (
      <svg className='w-3 h-3 text-accent-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
      </svg>
    )}
  </button>
)
