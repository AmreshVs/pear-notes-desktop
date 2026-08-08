import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Mic, Paperclip } from 'lucide-react'

export default function AttachmentMenu({
  onClose,
  onInsertImage,
  onInsertFile,
  onRecordAudio,
  buttonRef
}) {
  const { t } = useTranslation()
  const menuRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const firstItemRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [buttonRef, onClose])

  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      buttonRef.current?.focus()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])
    const index = items.indexOf(document.activeElement)
    const nextIndex =
      event.key === 'ArrowDown'
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length
    items[nextIndex]?.focus()
  }

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    const videoFiles = files.filter((file) => file.type.startsWith('video/'))
    if (imageFiles.length > 0) onInsertImage(imageFiles)
    if (videoFiles.length > 0) onInsertFile(videoFiles)
    onClose()
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    onInsertFile(files)
    onClose()
  }

  const handleRecordAudio = () => {
    onRecordAudio()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      role='menu'
      aria-label={t('attachmentMenu.ariaLabel')}
      onKeyDown={handleMenuKeyDown}
      className='absolute top-full left-0 mt-3 bg-bg-panel backdrop-blur-2xl border border-overlay-medium rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-56 animate-in zoom-in-95 fade-in duration-300 origin-top-left overflow-hidden z-[120]'
    >
      <div className='absolute -top-12 -right-12 w-24 h-24 bg-accent-primary/10 blur-[40px] rounded-full pointer-events-none' />

      <div className='p-2 relative z-10'>
        <input
          ref={imageInputRef}
          type='file'
          accept='image/*,video/*'
          onChange={handleImageSelect}
          className='hidden'
          multiple
          tabIndex={-1}
        />
        <input
          ref={fileInputRef}
          type='file'
          onChange={handleFileSelect}
          className='hidden'
          multiple
          tabIndex={-1}
        />

        <button
          ref={firstItemRef}
          type='button'
          role='menuitem'
          onClick={() => imageInputRef.current?.click()}
          className='w-full px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95 group text-left'
        >
          <span className='w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/20 transition-colors'>
            <Image className='w-4 h-4' />
          </span>
          <span className='text-sm font-bold text-text-primary tracking-tight'>
            {t('attachmentMenu.photoVideo')}
          </span>
        </button>

        <button
          type='button'
          role='menuitem'
          onClick={() => fileInputRef.current?.click()}
          className='w-full px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95 group text-left'
        >
          <span className='w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/20 transition-colors'>
            <Paperclip className='w-4 h-4' />
          </span>
          <span className='text-sm font-bold text-text-primary tracking-tight'>
            {t('attachmentMenu.chooseFile')}
          </span>
        </button>

        <div className='h-px bg-overlay-soft my-1 mx-2' />

        <button
          type='button'
          role='menuitem'
          onClick={handleRecordAudio}
          className='w-full px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95 group text-left'
        >
          <span className='w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/20 transition-colors'>
            <Mic className='w-4 h-4' />
          </span>
          <span className='text-sm font-bold text-text-primary tracking-tight'>
            {t('attachmentMenu.recordAudio')}
          </span>
        </button>
      </div>
    </div>
  )
}
