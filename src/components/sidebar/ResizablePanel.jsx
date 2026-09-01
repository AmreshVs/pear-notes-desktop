import { useCallback, useEffect, useRef, useState } from 'react'

function storedWidth(storageKey, defaultWidth, minWidth, maxWidth) {
  if (!storageKey) return defaultWidth

  try {
    const saved = Number(window.localStorage.getItem(`panelWidth:${storageKey}`))
    if (!Number.isFinite(saved) || saved <= 0) return defaultWidth
    return Math.max(minWidth, Math.min(maxWidth, saved))
  } catch {
    return defaultWidth
  }
}

export default function ResizablePanel({
  children,
  storageKey,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 500,
  collapsed = false,
  collapsedWidth = 60
}) {
  const [baseWidth, setBaseWidth] = useState(() =>
    storedWidth(storageKey, defaultWidth, minWidth, maxWidth)
  )
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const currentWidthRef = useRef(baseWidth)

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing) return
      const diff = e.clientX - startXRef.current
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff))
      currentWidthRef.current = newWidth
      setBaseWidth(newWidth)
    },
    [isResizing, minWidth, maxWidth]
  )

  // Persist once the drag ends rather than on every mousemove.
  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    if (!storageKey) return

    try {
      window.localStorage.setItem(`panelWidth:${storageKey}`, String(currentWidthRef.current))
    } catch {
      // Storage unavailable — the width just reverts to the default next launch.
    }
  }, [storageKey])

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
    currentWidthRef.current = baseWidth
  }

  const displayWidth = collapsed ? collapsedWidth : baseWidth

  return (
    <div
      className='relative flex flex-shrink-0'
      style={{
        width: `${displayWidth}px`,
        transition: isResizing
          ? 'none'
          : 'width var(--animation-duration-standard) var(--animation-timing-standard)',
        overflow: 'hidden',
        willChange: 'width'
      }}
    >
      <div
        className='h-full w-full overflow-hidden transition-opacity duration-300 ease-in-out'
        style={{
          opacity: collapsed ? 0 : 1,
          minWidth: collapsed ? 0 : `${minWidth}px`,
          pointerEvents: collapsed ? 'none' : 'auto',
          transform: 'translateZ(0)'
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
