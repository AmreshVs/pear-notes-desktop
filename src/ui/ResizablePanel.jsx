import { useState, useRef, useEffect, useCallback } from 'react'

export default function ResizablePanel({
  children,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 500,
  collapsed = false,
  collapsedWidth = 60
}) {
  const [baseWidth, setBaseWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return
    const diff = e.clientX - startXRef.current
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff))
    setBaseWidth(newWidth)
  }, [isResizing, minWidth, maxWidth])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleMouseDown = (e) => {
    if (collapsed) return
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = baseWidth
  }

  const displayWidth = collapsed ? collapsedWidth : baseWidth

  return (
    <div
      className='relative flex flex-shrink-0'
      style={{
        width: `${displayWidth}px`,
        transition: isResizing ? 'none' : 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
    >
      <div 
        className="h-full w-full overflow-hidden transition-opacity duration-300"
        style={{ 
          opacity: collapsed ? 0 : 1,
          minWidth: collapsed ? 0 : `${minWidth}px`,
          pointerEvents: collapsed ? 'none' : 'auto'
        }}
      >
        {children}
      </div>
      {!collapsed && (
        <div
          className='absolute right-0 top-0 bottom-0 cursor-col-resize z-10 w-2 -mr-1 group'
          onMouseDown={handleMouseDown}
        >
          <div
            className={`absolute right-0 top-0 bottom-0 w-0.5 transition-all duration-200 ${
              isResizing
                ? 'bg-accent-primary opacity-100'
                : 'bg-transparent opacity-0 group-hover:bg-accent-primary group-hover:opacity-70'
            }`}
          />
        </div>
      )}
    </div>
  )
}
