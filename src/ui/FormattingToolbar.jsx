import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Square,
  Indent,
  Outdent,
  Code,
  Link2,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  ChevronDown,
  Undo,
  Redo
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import LinkModal from './LinkModal'

export default function FormattingToolbar({ editor }) {
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
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const headingMenuRef = useRef(null)

  // Update editor state when editor changes
  useEffect(() => {
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

    // Initial state
    updateState()

    // Listen to editor events
    editor.on('selectionUpdate', updateState)
    editor.on('transaction', updateState)
    editor.on('update', updateState)

    return () => {
      editor.off('selectionUpdate', updateState)
      editor.off('transaction', updateState)
      editor.off('update', updateState)
    }
  }, [editor])

  // Close heading menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headingMenuRef.current && !headingMenuRef.current.contains(event.target)) {
        setShowHeadingMenu(false)
      }
    }
    if (showHeadingMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHeadingMenu])

  const handleSetLink = ({ url, text }) => {
    if (!editor) return

    if (url) {
      // If there's selected text, wrap it in a link
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
    setShowHeadingMenu(false)
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

  if (!editor) {
    return null
  }

  return (
    <>
      <div className='flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-2 rounded-lg mb-4 overflow-x-auto toolbar-scroll bg-bg-tertiary border border-border-primary shadow-xs min-h-[40px]'>

        {/* Undo/Redo */}
        <Button
          onClick={() => editor?.chain().focus().undo().run()}
          isActive={false}
          disabled={!editorState.canUndo}
          title='Undo (⌘Z)'
        >
          <Undo className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().redo().run()}
          isActive={false}
          disabled={!editorState.canRedo}
          title='Redo (⌘⇧Z)'
        >
          <Redo className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Divider />

        {/* Text Formatting */}
        <Button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editorState.isBold}
          disabled={!editor}
          title='Bold'
        >
          <Bold className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editorState.isItalic}
          disabled={!editor}
          title='Italic'
        >
          <Italic className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editorState.isUnderline}
          disabled={!editor}
          title='Underline'
        >
          <Underline className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editorState.isStrike}
          disabled={!editor}
          title='Strikethrough'
        >
          <Strikethrough className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleHighlight().run()}
          isActive={editorState.isHighlight}
          disabled={!editor}
          title='Highlight'
        >
          <Highlighter className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Divider />

        {/* Heading Dropdown */}
        <div className='relative' ref={headingMenuRef}>
          <Button
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            isActive={editorState.headingLevel > 0}
            disabled={!editor}
            title='Heading'
            className='flex items-center gap-1'
          >
            {editorState.headingLevel === 1 ? (
              <Heading1 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
            ) : editorState.headingLevel === 2 ? (
              <Heading2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
            ) : editorState.headingLevel === 3 ? (
              <Heading3 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
            ) : (
              <Type className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
            )}
            <ChevronDown className='w-2.5 h-2.5 sm:w-3 sm:h-3' />
          </Button>
          {showHeadingMenu && (
            <div className='absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 bg-bg-panel border border-border-secondary min-w-[160px]'>
              <button
                onClick={() => handleHeadingClick(0)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-panel-tertiary transition-colors text-sm ${
                  editorState.headingLevel === 0
                    ? 'text-accent-primary'
                    : 'text-text-secondary'
                }`}
              >
                <Type className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                <span>Paragraph</span>
              </button>
              <button
                onClick={() => handleHeadingClick(1)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-panel-tertiary transition-colors text-sm ${
                  editorState.headingLevel === 1
                    ? 'text-accent-primary'
                    : 'text-text-secondary'
                }`}
              >
                <Heading1 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                <span>Heading 1</span>
              </button>
              <button
                onClick={() => handleHeadingClick(2)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-panel-tertiary transition-colors text-sm ${
                  editorState.headingLevel === 2
                    ? 'text-accent-primary'
                    : 'text-text-secondary'
                }`}
              >
                <Heading2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                <span>Heading 2</span>
              </button>
              <button
                onClick={() => handleHeadingClick(3)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-panel-tertiary transition-colors text-sm ${
                  editorState.headingLevel === 3
                    ? 'text-accent-primary'
                    : 'text-text-secondary'
                }`}
              >
                <Heading3 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                <span>Heading 3</span>
              </button>
            </div>
          )}
        </div>
        <Divider />

        {/* Lists */}
        <Button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editorState.isBulletList}
          disabled={!editor}
          title='Bullet List'
        >
          <List className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editorState.isOrderedList}
          disabled={!editor}
          title='Numbered List'
        >
          <ListOrdered className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          isActive={editorState.isTaskList}
          disabled={!editor}
          title='Checklist'
        >
          <Square className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Divider />

        {/* Indent/Outdent */}
        <Button
          onClick={() => editor?.chain().focus().sinkListItem('listItem').run()}
          isActive={false}
          disabled={!editor || !editor.can().sinkListItem('listItem')}
          title='Indent'
        >
          <Indent className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().liftListItem('listItem').run()}
          isActive={false}
          disabled={!editor || !editor.can().liftListItem('listItem')}
          title='Outdent'
        >
          <Outdent className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Divider />

        {/* Code */}
        <Button
          onClick={() => editor?.chain().focus().toggleCode().run()}
          isActive={editorState.isCode}
          disabled={!editor}
          title='Inline Code'
        >
          <Code className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          isActive={editorState.isCodeBlock}
          disabled={!editor}
          title='Code Block'
        >
          <Code className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
          isActive={false}
          disabled={!editor}
          title='Subscript'
        >
          <SubscriptIcon className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
          isActive={false}
          disabled={!editor}
          title='Superscript'
        >
          <SuperscriptIcon className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Divider />

        {/* Text Alignment */}
        <Button
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          isActive={editorState.textAlign === 'left'}
          disabled={!editor}
          title='Align Left'
        >
          <AlignLeft className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          isActive={editorState.textAlign === 'center'}
          disabled={!editor}
          title='Align Center'
        >
          <AlignCenter className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          isActive={editorState.textAlign === 'right'}
          disabled={!editor}
          title='Align Right'
        >
          <AlignRight className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
          isActive={editorState.textAlign === 'justify'}
          disabled={!editor}
          title='Justify'
        >
          <AlignJustify className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Divider />

        {/* Blockquote & Horizontal Rule */}
        <Button
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          isActive={editorState.isBlockquote}
          disabled={!editor}
          title='Blockquote'
        >
          <Quote className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          isActive={false}
          disabled={!editor}
          title='Horizontal Rule'
        >
          <Minus className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
        <Button
          onClick={() => setShowLinkModal(true)}
          isActive={editorState.isLink}
          disabled={!editor}
          title='Link'
        >
          <Link2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
        </Button>
      </div>

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSubmit={handleSetLink}
        initialUrl={getCurrentLink().url}
        initialText={getCurrentLink().text}
      />
    </>
  )
}

const Button = ({ onClick, isActive, disabled, title, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`p-1 sm:p-1.5 rounded transition-colors flex-shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center ${
      isActive
        ? 'bg-accent-primary text-text-primary'
        : disabled
          ? 'text-text-tertiary opacity-50 cursor-not-allowed'
          : 'text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary'
    } ${className}`}
    title={title}
    disabled={disabled}
  >
    {children}
  </button>
)

const Divider = () => (
  <div className='w-px h-6 mx-0.5 sm:mx-1 flex-shrink-0 bg-border-primary' />
)
