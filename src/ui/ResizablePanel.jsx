import { useState, useRef, useEffect } from 'react'

export default function ResizablePanel({
  children,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 500
}) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const diff = e.clientX - startXRef.current
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth])

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }

  return (
    <div ref={panelRef} className='relative flex' style={{ width: `${width}px` }}>
      {children}
      {/* Wider hover area for better UX */}
      <div
        className='absolute right-0 top-0 bottom-0 cursor-col-resize'
        style={{
          zIndex: 10,
          width: '8px',
          marginRight: '-4px'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Visible resize handle */}
        <div
          className='absolute right-0 top-0 bottom-0 transition-all'
          style={{
            width: isResizing ? '2px' : '2px',
            backgroundColor: isResizing ? 'var(--accent-primary)' : 'transparent',
            opacity: isResizing ? 1 : 0,
            transition: 'var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'var(--accent-primary)'
              e.currentTarget.style.opacity = '0.7'
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.opacity = '0'
            }
          }}
        />
      </div>
    </div>
  )
}
