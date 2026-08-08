import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, X } from 'lucide-react'

export default function LinkModal({ onClose, onSetLink, currentUrl = '', currentText = '' }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState(currentUrl)
  const [text, setText] = useState(currentText)
  const urlInputRef = useRef(null)

  useEffect(() => {
    if (urlInputRef.current) {
      urlInputRef.current.focus()
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (url.trim()) {
      onSetLink({ url: url.trim(), text: text.trim() || url.trim() })
      onClose()
    }
  }

  const handleRemove = () => {
    onSetLink({ url: '', text: '' })
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleTextChange = (e) => {
    const newText = e.target.value
    setText(newText)

    if (!url && newText) {
      const urlPattern = /^(https?:\/\/|www\.)/i
      if (urlPattern.test(newText)) {
        setUrl(newText.startsWith('http') ? newText : `https://${newText}`)
      }
    }
  }

  return (
    <div
      className='fixed inset-0 bg-backdrop-light flex items-center justify-center z-50 backdrop-blur-sm'
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className='bg-bg-panel border border-border-secondary rounded-xl w-full max-w-md mx-4 shadow-xl overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='bg-bg-panel-secondary border-b border-border-primary flex items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-2'>
            <Link2 className='w-5 h-5 text-text-primary' />
            <h2 className='text-text-primary text-xl font-semibold'>{t('linkModal.addLink')}</h2>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-bg-panel-secondary hover:bg-bg-panel-tertiary flex items-center justify-center text-text-primary transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 bg-bg-panel'>
          <div className='space-y-4'>
            <div>
              <label className='block text-text-primary text-sm mb-2 font-medium'>
                {t('linkModal.linkText')}
              </label>
              <input
                type='text'
                value={text}
                onChange={handleTextChange}
                placeholder={t('linkModal.linkTextPlaceholder')}
                className='w-full px-4 py-2.5 rounded-lg text-sm bg-bg-tertiary border border-border-tertiary text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary'
                maxLength={100}
              />
            </div>
            <div>
              <label className='block text-text-primary text-sm mb-2 font-medium'>
                {t('linkModal.url')}
              </label>
              <input
                ref={urlInputRef}
                type='url'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder='https://example.com'
                className='w-full px-4 py-2.5 rounded-lg text-sm bg-bg-tertiary border border-border-tertiary text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary'
                required
              />
              <p className='text-xs mt-2 text-text-tertiary'>{t('linkModal.enterWebAddress')}</p>
            </div>
          </div>

          <div className='flex items-center justify-between mt-6'>
            {currentUrl && (
              <button
                type='button'
                onClick={handleRemove}
                className='px-4 py-2.5 rounded-lg transition-all text-sm font-medium text-accent-danger hover:bg-accent-danger/10'
              >
                {t('linkModal.removeLink')}
              </button>
            )}
            <div className='flex items-center gap-3 ml-auto'>
              <button
                type='button'
                onClick={onClose}
                className='px-6 py-2.5 rounded-lg transition-all text-sm font-medium bg-bg-panel-tertiary hover:bg-bg-panel-secondary text-text-secondary hover:text-text-primary border border-border-tertiary hover:border-border-secondary'
              >
                {t('common.cancel')}
              </button>
              <button
                type='submit'
                disabled={!url.trim()}
                className='px-6 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md bg-accent-primary text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-primary'
              >
                {t('linkModal.addLink')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
