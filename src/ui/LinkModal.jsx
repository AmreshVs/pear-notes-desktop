import { X, Link2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function LinkModal({ onClose, onSetLink, currentUrl = '', currentText = '' }) {
  const [url, setUrl] = useState(currentUrl)
  const [text, setText] = useState(currentText)
  const urlInputRef = useRef(null)

  useEffect(() => {
    // Focus URL input when modal opens
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

  // Auto-detect URL if text looks like a URL
  useEffect(() => {
    if (!url && text) {
      const urlPattern = /^(https?:\/\/|www\.)/i
      if (urlPattern.test(text)) {
        setUrl(text.startsWith('http') ? text : `https://${text}`)
      }
    }
  }, [text, url])

  return (
    <div
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className='modal-bg rounded-lg w-full max-w-md mx-4 shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='modal-header-bg flex items-center justify-between px-6 py-4 rounded-t-lg'>
          <div className='flex items-center gap-2'>
            <Link2 className='w-5 h-5 text-primary' />
            <h2 className='text-primary text-xl font-semibold'>Add Link</h2>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-panel-secondary hover:bg-panel-tertiary flex items-center justify-center text-primary transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className='p-6'>
          <div className='space-y-4'>
            <div>
              <label className='block text-primary text-sm mb-2 font-medium'>Link Text</label>
              <input
                type='text'
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='Link text'
                className='input-field w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent'
                maxLength={100}
              />
            </div>
            <div>
              <label className='block text-primary text-sm mb-2 font-medium'>URL</label>
              <input
                ref={urlInputRef}
                type='url'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder='https://example.com'
                className='input-field w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-transparent'
                required
              />
              <p className='text-xs mt-2 text-tertiary'>Enter the web address</p>
            </div>
          </div>

          {/* Actions */}
          <div className='flex items-center justify-between mt-6'>
            {currentUrl && (
              <button
                type='button'
                onClick={handleRemove}
                className='px-4 py-2.5 rounded-lg transition-all text-sm font-medium text-accent-danger hover:bg-accent-danger/10'
              >
                Remove Link
              </button>
            )}
            <div className='flex items-center gap-3 ml-auto'>
              <button
                type='button'
                onClick={onClose}
                className='button-secondary px-6 py-2.5 rounded-lg transition-all text-sm font-medium'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={!url.trim()}
                className='btn-primary px-6 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Add Link
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

