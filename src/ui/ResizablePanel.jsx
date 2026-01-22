import { useState, useRef, useEffect } from 'react'

export default function ResizablePanel({
  children,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 500,
  collapsed = false,
  collapsedWidth = 60
}) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const lastWidthRef = useRef(defaultWidth)

  useEffect(() => {
    if (collapsed) {
      lastWidthRef.current = width > collapsedWidth ? width : minWidth
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWidth(collapsedWidth)
    } else {
      setWidth(Math.max(minWidth, lastWidthRef.current))
    }
  }, [collapsed, collapsedWidth, minWidth, width])

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
    if (collapsed) return
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }

  return (
    <div
      ref={panelRef}
      className='relative flex overflow-hidden'
      style={{
        width: `${width}px`,
        transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
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
