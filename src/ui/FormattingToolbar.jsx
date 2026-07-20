import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bold,
  Code as CodeIcon,
  Highlighter,
  Italic,
  Link2,
  Paperclip,
  Redo,
  Square,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo
} from 'lucide-react'

import { useFormattingToolbar } from '../hooks/useFormattingToolbar'

import AttachmentMenu from './AttachmentMenu'
import AudioRecorderModal from './AudioRecorderModal'
import LinkModal from './LinkModal'

export default function FormattingToolbar({ editor, noteKey }) {
  const { t } = useTranslation()
  const {
    editorState,
    showFormatMenu,
    setShowFormatMenu,
    showLinkModal,
    setShowLinkModal,
    showAttachmentMenu,
    setShowAttachmentMenu,
    showAudioRecorder,
    setShowAudioRecorder,
    formatMenuRef,
    attachmentButtonRef,
    handleSetLink,
    handleHeadingClick,
    getCurrentLink,
    handleInsertImage,
    handleInsertFile,
    handleInsertAudio,
    handleToggleCodeBlock
  } = useFormattingToolbar(editor, noteKey)

  if (!editor) {
    return null
  }

  return (
    <>
      <div className='flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 rounded-xl bg-bg-panel/90 backdrop-blur-xl border border-border-primary shadow-md w-fit relative z-50 transition-all duration-300 hover:bg-bg-panel/95 hover:border-border-secondary'>
        <div className='relative' ref={formatMenuRef}>
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all active:scale-95 duration-200 ${
              showFormatMenu ||
              editorState.headingLevel > 0 ||
              editorState.isBold ||
              editorState.isItalic
                ? 'bg-accent-primary text-accent-on-primary shadow-[0_0_15px_rgba(var(--accent-primary),0.2)]'
                : 'text-text-primary hover:bg-bg-tertiary/50 hover:text-text-primary'
            }`}
            title={t('formatting.title')}
          >
            <span className='font-serif text-lg font-black tracking-tighter'>Aa</span>
          </button>

          {showFormatMenu && (
            <div className='absolute top-full left-0 mt-3 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 bg-bg-panel backdrop-blur-2xl border border-overlay-medium min-w-[280px] overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-top-left'>
              <div className='absolute -top-12 -right-12 w-24 h-24 bg-accent-primary/10 blur-[40px] rounded-full pointer-events-none' />

              <div className='flex items-center justify-between p-2 border-b border-divider-light relative z-10'>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editorState.isBold}
                  title={t('formatting.bold')}
                >
                  <Bold className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editorState.isItalic}
                  title={t('formatting.italic')}
                >
                  <Italic className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  isActive={editorState.isUnderline}
                  title={t('formatting.underline')}
                >
                  <Underline className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  isActive={editorState.isStrike}
                  title={t('formatting.strikethrough')}
                >
                  <Strikethrough className='w-4 h-4' strokeWidth={2.5} />
                </MenuButton>
                <div className='w-px h-5 bg-overlay-strong mx-1' />
                <MenuButton
                  onClick={() => editor?.chain().focus().toggleHighlight().run()}
                  isActive={editorState.isHighlight}
                  title={t('formatting.highlight')}
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
                  label={t('formatting.types.title')}
                  style='text-2xl font-black tracking-tight'
                />
                <ListButton
                  onClick={() => handleHeadingClick(2)}
                  isActive={editorState.headingLevel === 2}
                  label={t('formatting.types.heading')}
                  style='text-xl font-bold tracking-tight'
                />
                <ListButton
                  onClick={() => handleHeadingClick(3)}
                  isActive={editorState.headingLevel === 3}
                  label={t('formatting.types.subheading')}
                  style='text-lg font-bold opacity-90'
                />
                <ListButton
                  onClick={() => handleHeadingClick(0)}
                  isActive={
                    editorState.headingLevel === 0 &&
                    !editorState.isCodeBlock &&
                    !editorState.isCode
                  }
                  label={t('formatting.types.bodyText')}
                  showCheck={
                    editorState.headingLevel === 0 &&
                    !editorState.isCodeBlock &&
                    !editorState.isCode
                  }
                  style='font-medium opacity-80'
                />
                <ListButton
                  onClick={() => editor?.chain().focus().toggleCode().run()}
                  isActive={editorState.isCode}
                  label={t('formatting.types.monospaced')}
                  style='font-mono text-sm opacity-80'
                />

                <div className='h-px bg-divider-light my-2 mx-1' />

                <ListButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editorState.isBulletList}
                  label={t('formatting.types.bulletedList')}
                  icon={
                    <div className='w-1.5 h-1.5 rounded-full bg-text-tertiary/70 mr-3 ml-1 group-hover:bg-accent-primary transition-colors' />
                  }
                />
                <ListButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editorState.isOrderedList}
                  label={t('formatting.types.numberedList')}
                  icon={
                    <span className='text-xs font-bold text-text-tertiary/70 mr-3 ml-0.5 group-hover:text-accent-primary transition-colors'>
                      1.
                    </span>
                  }
                />

                <div className='h-px bg-divider-light my-2 mx-1' />

                <ListButton
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  isActive={editorState.isBlockquote}
                  label={t('formatting.types.quoteBlock')}
                  icon={
                    <div className='w-1 h-3 bg-text-tertiary/50 rounded-full mr-3.5 ml-1 group-hover:bg-accent-primary transition-colors' />
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className='w-px h-5 bg-overlay-strong mx-1' />

        <Button
          onClick={handleToggleCodeBlock}
          isActive={editorState.isCodeBlock}
          title={t('formatting.codeBlock')}
          className='w-9 h-9'
        >
          <CodeIcon className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <div className='w-px h-5 bg-overlay-strong mx-1' />

        <Button
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          isActive={editorState.isTaskList}
          title={t('formatting.checklist')}
          className='w-9 h-9'
        >
          <Square className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <Button
          onClick={() => setShowLinkModal(true)}
          isActive={editorState.isLink}
          title={t('formatting.link')}
          className='w-9 h-9'
        >
          <Link2 className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <Button
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title={t('formatting.insertTable')}
          className='w-9 h-9'
        >
          <TableIcon className='w-4 h-4' strokeWidth={2.5} />
        </Button>

        <div className='relative'>
          <Button
            ref={attachmentButtonRef}
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            isActive={showAttachmentMenu}
            hasPopup='menu'
            expanded={showAttachmentMenu}
            title={t('formatting.attachments')}
            className='w-9 h-9'
          >
            <Paperclip className='w-4 h-4' strokeWidth={2.5} />
          </Button>

          {showAttachmentMenu && (
            <AttachmentMenu
              onClose={() => setShowAttachmentMenu(false)}
              onInsertImage={handleInsertImage}
              onInsertFile={handleInsertFile}
              onRecordAudio={() => setShowAudioRecorder(true)}
              buttonRef={attachmentButtonRef}
            />
          )}
        </div>

        <div className='w-px h-5 bg-overlay-strong mx-1' />

        <div className='flex items-center gap-1'>
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editorState.canUndo}
            className='p-2 text-text-primary hover:text-text-primary hover:bg-bg-tertiary/50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95'
            title={t('formatting.undo')}
          >
            <Undo className='w-4 h-4' />
          </button>
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editorState.canRedo}
            className='p-2 text-text-primary hover:text-text-primary hover:bg-bg-tertiary/50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95'
            title={t('formatting.redo')}
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

      {showAudioRecorder && (
        <AudioRecorderModal
          onClose={() => setShowAudioRecorder(false)}
          onSaveAudio={handleInsertAudio}
        />
      )}
    </>
  )
}

const Button = forwardRef(
  ({ onClick, isActive, disabled, title, children, className = '', hasPopup, expanded }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      aria-haspopup={hasPopup}
      aria-expanded={hasPopup ? !!expanded : undefined}
      className={`rounded-lg transition-all flex-shrink-0 flex items-center justify-center active:scale-95 duration-200 ${
        isActive
          ? 'bg-accent-primary text-accent-on-primary shadow-[0_0_15px_rgba(var(--accent-primary),0.2)]'
          : disabled
            ? 'text-text-tertiary opacity-30 cursor-not-allowed'
            : 'text-text-primary hover:bg-bg-tertiary/60 hover:text-text-primary'
      } ${className}`}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'

const MenuButton = ({ onClick, isActive, title, children }) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded-lg transition-all flex items-center justify-center active:scale-95 duration-200 ${
      isActive
        ? 'bg-accent-primary text-accent-on-primary shadow-[0_0_10px_rgba(var(--accent-primary),0.2)]'
        : 'text-text-primary hover:bg-overlay-soft hover:text-text-primary'
    }`}
    title={title}
    aria-label={title}
  >
    {children}
  </button>
)

const ListButton = ({ onClick, isActive, label, icon, showCheck, style }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all hover:bg-accent-primary/10 group active:scale-95 ${
      isActive
        ? 'bg-accent-primary/10 text-accent-primary'
        : 'text-text-secondary hover:text-text-primary'
    }`}
  >
    <div className='flex items-center'>
      {icon}
      <span
        className={`text-base tracking-tight ${style || (isActive ? 'font-bold' : 'font-medium')}`}
      >
        {label}
      </span>
    </div>
    {(isActive || showCheck) && (
      <svg
        className='w-4 h-4 text-accent-primary'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
      >
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
      </svg>
    )}
  </button>
)
