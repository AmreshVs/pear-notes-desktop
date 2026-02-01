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
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      } else if (selectedText) {
        editor.chain().focus().setLink({ href: url }).run()
      } else if (text) {
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      } else {
        editor.chain().focus().setLink({ href: url }).run()
      }
    } else {
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

  const handleInsertImage = async (files) => {
    if (!editor || !files) return
    const fileList = Array.isArray(files) ? files : [files]
    
    const { to } = editor.state.selection
    editor.commands.setTextSelection(to)
    
    for (const file of fileList) {
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
  }

  const handleInsertFile = async (files) => {
    if (!editor || !files) return
    const fileList = Array.isArray(files) ? files : [files]

    const { to } = editor.state.selection
    editor.commands.setTextSelection(to)

    for (const file of fileList) {
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
  }

  const handleInsertAudio = async ({ data, duration }) => {
    if (!editor) return
    try {
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

  const handleToggleCodeBlock = () => {
    if (!editor) return

    if (editor.isActive('codeBlock')) {
      editor.chain().focus().toggleCodeBlock().run()
    } else {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, '\n')
      
      if (text.trim()) {
        editor.chain().focus().deleteSelection().setCodeBlock().insertContent(text).run()
      } else {
        editor.chain().focus().toggleCodeBlock().run()
      }
    }
  }

  if (!editor) {
    return null
  }

  return (
    <>
      <div className='flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-xl bg-bg-panel/60 backdrop-blur-xl border border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-fit relative z-20 transition-all duration-300 hover:bg-bg-panel/60 hover:border-white/[0.1]'>
        <div className='relative' ref={formatMenuRef}>
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all active:scale-95 duration-200 ${
              showFormatMenu || editorState.headingLevel > 0 || editorState.isBold || editorState.isItalic 
                ? 'bg-accent-primary text-text-primary shadow-[0_0_15px_rgba(var(--accent-primary),0.2)]' 
                : 'text-text-primary hover:bg-bg-tertiary/50 hover:text-text-primary'
            }`}
            title='Formatting'
          >
            <span className='font-serif text-[18px] font-black tracking-tighter'>Aa</span>
          </button>

          {showFormatMenu && (
            <div className='absolute top-full left-0 mt-3 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 bg-bg-panel backdrop-blur-2xl border border-white/[0.08] min-w-[280px] overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-top-left'>
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent-primary/10 blur-[40px] rounded-full pointer-events-none" />
              
              <div className='flex items-center justify-between p-2 border-b border-white/[0.06] relative z-10'>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editorState.isBold}
                  title='Bold'
                >
                  <Bold className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editorState.isItalic}
                  title='Italic'
                >
                  <Italic className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  isActive={editorState.isUnderline}
                  title='Underline'
                >
                  <Underline className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  isActive={editorState.isStrike}
                  title='Strikethrough'
                >
                  <Strikethrough className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <div className='w-px h-5 bg-white/[0.1] mx-1' />
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleHighlight().run()}
                  isActive={editorState.isHighlight}
                  title='Highlight'
                >
                  <div className='relative'>
                    <Highlighter className='w-4 h-4' strokeWidth={2.5} />
                    <div className='absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_5px_var(--accent-primary)]' />
                  </div>
                </MenuButton>
              </div>

              <div className='p-2 max-h-[400px] overflow-y-auto custom-scrollbar space-y-1 relative z-10'>
                <ListButton
                  onClick={() => handleHeadingClick(1)}
                  isActive={editorState.headingLevel === 1}
                  label='Title'
                  style="text-2xl font-black tracking-tight"
                />
                <ListButton
                  onClick={() => handleHeadingClick(2)}
                  isActive={editorState.headingLevel === 2}
                  label='Heading'
                  style="text-xl font-bold tracking-tight"
                />
                <ListButton
                  onClick={() => handleHeadingClick(3)}
                  isActive={editorState.headingLevel === 3}
                  label='Subheading'
                  style="text-lg font-bold opacity-90"
                />
                <ListButton
                  onClick={() => handleHeadingClick(0)}
                  isActive={editorState.headingLevel === 0 && !editorState.isCodeBlock && !editorState.isCode}
                  label='Body Text'
                  showCheck={editorState.headingLevel === 0 && !editorState.isCodeBlock && !editorState.isCode}
                  style="font-medium opacity-80"
                />
                <ListButton
                  onClick={() => editor?.chain().focus().toggleCode().run()}
                  isActive={editorState.isCode}
                  label='Monospaced'
                  style="font-mono text-sm opacity-80"
                />
                
                <div className='h-px bg-white/[0.06] my-2 mx-1' />
                
                <ListButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editorState.isBulletList}
                  label='Bulleted List'
                  icon={<div className='w-1.5 h-1.5 rounded-full bg-text-tertiary/70 mr-3 ml-1 group-hover:bg-accent-primary transition-colors' />}
                />
                <ListButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editorState.isOrderedList}
                  label='Numbered List'
                  icon={<span className='text-[10px] font-bold text-text-tertiary/70 mr-3 ml-0.5 group-hover:text-accent-primary transition-colors'>1.</span>}
                />

                <div className='h-px bg-white/[0.06] my-2 mx-1' />

                <ListButton
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  isActive={editorState.isBlockquote}
                  label='Quote Block'
                  icon={<div className='w-1 h-3 bg-text-tertiary/50 rounded-full mr-3.5 ml-1 group-hover:bg-accent-primary transition-colors' />}
                />
              </div>
            </div>
          )}
        </div>

        <div className='w-px h-5 bg-white/[0.1] mx-1' />

        <Button
          onClick={handleToggleCodeBlock}
          isActive={editorState.isCodeBlock}
          title='Code Block'
          className='w-9 h-9'
        >
          <CodeIcon className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <div className='w-px h-5 bg-white/[0.1] mx-1' />

        <Button
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          isActive={editorState.isTaskList}
          title='Checklist'
          className='w-9 h-9'
        >
          <Square className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <Button
          onClick={() => setShowLinkModal(true)}
          isActive={editorState.isLink}
          title='Link'
          className='w-9 h-9'
        >
          <Link2 className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <Button
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title='Insert Table'
          className='w-9 h-9'
        >
          <TableIcon className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <Button
          ref={attachmentButtonRef}
          onClick={() => setShowAttachmentMenu(true)}
          title='Attachments'
          className='w-9 h-9'
        >
          <Paperclip className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <div className='w-px h-5 bg-white/[0.1] mx-1' />

        <div className='flex items-center gap-1'>
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editorState.canUndo}
            className='p-2 text-text-primary hover:text-text-primary hover:bg-bg-tertiary/50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95'
            title='Undo'
          >
            <Undo className='w-4 h-4' />
          </button>
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editorState.canRedo}
            className='p-2 text-text-primary hover:text-text-primary hover:bg-bg-tertiary/50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95'
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
    className={`rounded-lg transition-all flex-shrink-0 flex items-center justify-center active:scale-95 duration-200 ${
      isActive
        ? 'bg-accent-primary text-text-primary shadow-[0_0_15px_rgba(var(--accent-primary),0.2)]'
        : disabled
          ? 'text-text-tertiary opacity-30 cursor-not-allowed'
          : 'text-text-primary hover:bg-bg-tertiary/60 hover:text-text-primary'
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
    className={`p-1.5 rounded-lg transition-all flex items-center justify-center active:scale-95 duration-200 ${
      isActive
        ? 'bg-accent-primary text-text-primary shadow-[0_0_10px_rgba(var(--accent-primary),0.2)]'
        : 'text-text-primary hover:bg-white/[0.05] hover:text-text-primary'
    }`}
    title={title}
  >
    {children}
  </button>
)

const ListButton = ({ onClick, isActive, label, icon, showCheck, style }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all hover:bg-accent-primary/10 group active:scale-95 ${
      isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:text-text-primary'
    }`}
  >
    <div className='flex items-center'>
      {icon}
      <span className={`text-[14px] tracking-tight ${style || (isActive ? 'font-bold' : 'font-medium')}`}>{label}</span>
    </div>
    {(isActive || showCheck) && (
      <svg className='w-4 h-4 text-accent-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
      </svg>
    )}
  </button>
)
