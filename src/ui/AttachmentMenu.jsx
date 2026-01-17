import { useState, useEffect } from 'react'
import { Image, Paperclip, Mic } from 'lucide-react'

export default function AttachmentMenu({ onClose, onInsertImage, onInsertFile, onRecordAudio, buttonRef }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8, // 8px gap below button
        left: rect.left
      })
    }
  }, [buttonRef])

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onInsertImage(files)
      onClose()
    }
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onInsertFile(files)
      onClose()
    }
  }

  return (
    <>
      {/* Modal */}
      <div 
        className='fixed z-50 pointer-events-none'
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <div className='bg-bg-panel border border-border-secondary rounded-xl shadow-2xl w-64 pointer-events-auto animate-in zoom-in-95 fade-in duration-200 origin-top-left'>
          {/* Options List */}
          <div className='py-2'>
            {/* Choose Photo */}
            <label className='block'>
              <input
                type='file'
                accept='image/*'
                onChange={handleImageSelect}
                className='hidden'
                multiple
              />
              <div className='px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer border-b border-border-primary flex items-center gap-3'>
                <Image className='w-4 h-4 text-text-primary' />
                <p className='text-sm text-text-primary'>Choose Photos or Videos</p>
              </div>
            </label>

            {/* Attach File */}
            <label className='block'>
              <input type='file' onChange={handleFileSelect} className='hidden' multiple />
              <div className='px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer border-b border-border-primary flex items-center gap-3'>
                <Paperclip className='w-4 h-4 text-text-primary' />
                <p className='text-sm text-text-primary'>Attach File</p>
              </div>
            </label>

            {/* Record Audio */}
            <div 
              onClick={() => {
                onRecordAudio()
                onClose()
              }}
              className='px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer flex items-center gap-3'
            >
              <Mic className='w-4 h-4 text-text-primary' />
              <p className='text-sm text-text-primary'>Record Audio</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
