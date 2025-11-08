import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Square,
  Indent,
  Outdent,
  Code,
  Paperclip,
  Share2,
  Info,
  Settings,
  Moon,
  Sun
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Toolbar({
  searchQuery,
  onSearchChange,
  onSettingsClick,
  onSyncClick,
  onThemeToggle,
  theme,
  editor
}) {
  const [editorState, setEditorState] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isBulletList: false,
    isOrderedList: false,
    isTaskList: false,
    isCodeBlock: false
  })

  // Update editor state when editor changes
  useEffect(() => {
    if (!editor) {
      setEditorState({
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isBulletList: false,
        isOrderedList: false,
        isTaskList: false,
        isCodeBlock: false
      })
      return
    }

    const updateState = () => {
      setEditorState({
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isUnderline: editor.isActive('underline'),
        isBulletList: editor.isActive('bulletList'),
        isOrderedList: editor.isActive('orderedList'),
        isTaskList: editor.isActive('taskList'),
        isCodeBlock: editor.isActive('codeBlock')
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
  return (
    <div className='h-12 flex items-center px-4 gap-4' style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
      {/* Left: Navigation */}
      <div className='flex items-center gap-2'>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <ChevronLeft className='w-4 h-4' />
        </button>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <ChevronRight className='w-4 h-4' />
        </button>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <MoreHorizontal className='w-4 h-4' />
        </button>
      </div>

      {/* Center: Search */}
      <div className='flex-1 max-w-md mx-auto'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4' style={{ color: 'var(--text-tertiary)' }} />
          <input
            type='text'
            placeholder='Search All Notes'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-9 pr-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-1'
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-primary)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>

      {/* Right: Formatting & Actions */}
      <div className='flex items-center gap-1'>
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className='p-1.5 rounded transition-colors'
          style={{
            backgroundColor: editorState.isBold ? 'var(--accent-primary)' : 'transparent',
            color: editorState.isBold ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            if (!editorState.isBold) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!editorState.isBold) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Bold'
          disabled={!editor}
        >
          <Bold className='w-4 h-4' />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className='p-1.5 rounded transition-colors'
          style={{
            backgroundColor: editorState.isItalic ? 'var(--accent-primary)' : 'transparent',
            color: editorState.isItalic ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            if (!editorState.isItalic) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!editorState.isItalic) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Italic'
          disabled={!editor}
        >
          <Italic className='w-4 h-4' />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className='p-1.5 rounded transition-colors'
          style={{
            backgroundColor: editorState.isUnderline ? 'var(--accent-primary)' : 'transparent',
            color: editorState.isUnderline ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            if (!editorState.isUnderline) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!editorState.isUnderline) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Underline'
          disabled={!editor}
        >
          <Underline className='w-4 h-4' />
        </button>
        <div className='w-px h-6 mx-1' style={{ backgroundColor: 'var(--border-primary)' }} />
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className='p-1.5 rounded transition-colors'
          style={{
            backgroundColor: editorState.isBulletList ? 'var(--accent-primary)' : 'transparent',
            color: editorState.isBulletList ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            if (!editorState.isBulletList) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!editorState.isBulletList) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Bullet List'
          disabled={!editor}
        >
          <List className='w-4 h-4' />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className='p-1.5 rounded transition-colors'
          style={{
            backgroundColor: editorState.isOrderedList ? 'var(--accent-primary)' : 'transparent',
            color: editorState.isOrderedList ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            if (!editorState.isOrderedList) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!editorState.isOrderedList) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Numbered List'
          disabled={!editor}
        >
          <ListOrdered className='w-4 h-4' />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          className='p-1.5 rounded transition-colors'
          style={{
            backgroundColor: editorState.isTaskList ? 'var(--accent-primary)' : 'transparent',
            color: editorState.isTaskList ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            if (!editorState.isTaskList) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!editorState.isTaskList) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Checklist'
          disabled={!editor}
        >
          <Square className='w-4 h-4' />
        </button>
        <div className='w-px h-6 mx-1' style={{ backgroundColor: 'var(--border-primary)' }} />
        <button
          onClick={() => editor?.chain().focus().sinkListItem('listItem').run()}
          className='p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Indent'
          disabled={!editor || !editor.can().sinkListItem('listItem')}
        >
          <Indent className='w-4 h-4' />
        </button>
        <button
          onClick={() => editor?.chain().focus().liftListItem('listItem').run()}
          className='p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Outdent'
          disabled={!editor || !editor.can().liftListItem('listItem')}
        >
          <Outdent className='w-4 h-4' />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          className='p-1.5 rounded transition-colors'
          style={{
            backgroundColor: editorState.isCodeBlock ? 'var(--accent-primary)' : 'transparent',
            color: editorState.isCodeBlock ? 'var(--text-primary)' : 'var(--text-tertiary)'
          }}
          onMouseEnter={(e) => {
            if (!editorState.isCodeBlock) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!editorState.isCodeBlock) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }
          }}
          title='Code Block'
          disabled={!editor}
        >
          <Code className='w-4 h-4' />
        </button>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
          title='Attach'
        >
          <Paperclip className='w-4 h-4' />
        </button>
        <div className='w-px h-6 mx-1' style={{ backgroundColor: 'var(--border-primary)' }} />
        <button
          onClick={onSyncClick}
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
          title='Sync Devices'
        >
          <Share2 className='w-4 h-4' />
        </button>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
          title='Info'
        >
          <Info className='w-4 h-4' />
        </button>
        <button
          onClick={onSettingsClick}
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
          title='Settings'
        >
          <Settings className='w-4 h-4' />
        </button>
        <button
          onClick={onThemeToggle}
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
        </button>
      </div>
    </div>
  )
}

