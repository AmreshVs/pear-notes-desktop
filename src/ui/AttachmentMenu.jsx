import { useState, useEffect, useRef } from 'react'
import { Image, Paperclip, Mic } from 'lucide-react'

export default function AttachmentMenu({ onClose, onInsertImage, onInsertFile, onRecordAudio, buttonRef }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 12,
        left: rect.left - 160
      })
    }
  }, [buttonRef])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [buttonRef, onClose])

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      const imageFiles = files.filter(file => file.type.startsWith('image/'))
      const videoFiles = files.filter(file => file.type.startsWith('video/'))
      
      if (imageFiles.length > 0) {
        onInsertImage(imageFiles)
      }
      if (videoFiles.length > 0) {
        onInsertFile(videoFiles)
      }
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
    <div 
      className='fixed z-[120] pointer-events-none'
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div ref={menuRef} className='bg-bg-panel backdrop-blur-2xl border border-white/[0.08] rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-56 pointer-events-auto animate-in zoom-in-95 fade-in duration-300 origin-top-right overflow-hidden relative'>
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent-primary/10 blur-[40px] rounded-full pointer-events-none" />
        
        <div className='p-2 relative z-10'>
          <label className='block group'>
            <input
              type='file'
              accept='image/*,video/*'
              onChange={handleImageSelect}
              className='hidden'
              multiple
            />
            <div className='px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95'>
              <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/20 transition-colors">
                <Image className='w-4 h-4' />
              </div>
              <p className='text-[13px] font-bold text-text-primary tracking-tight'>Photos or Videos</p>
            </div>
          </label>

          <label className='block group'>
            <input type='file' onChange={handleFileSelect} className='hidden' multiple />
            <div className='px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95'>
              <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/20 transition-colors">
                <Paperclip className='w-4 h-4' />
              </div>
              <p className='text-[13px] font-bold text-text-primary tracking-tight'>Attach File</p>
            </div>
          </label>

          <div className="h-px bg-white/[0.05] my-1 mx-2" />

          <div 
            onClick={() => {
              onRecordAudio()
              onClose()
            }}
            className='px-4 py-3 rounded-xl hover:bg-accent-primary/10 transition-all cursor-pointer flex items-center gap-3 active:scale-95 group'
          >
            <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/20 transition-colors">
              <Mic className='w-4 h-4' />
            </div>
            <p className='text-[13px] font-bold text-text-primary tracking-tight'>Record Audio</p>
          </div>
        </div>
      </div>
    </div>
  )
}
