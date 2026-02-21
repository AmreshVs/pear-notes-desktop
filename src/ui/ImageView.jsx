import { NodeViewWrapper } from '@tiptap/react'
import { useSelector } from 'react-redux'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { Resizable } from 'react-resizable'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { backendApi } from '@pear-notes/core/backend/api.js'
import 'react-resizable/css/styles.css'

export default function ImageView({ node, updateAttributes, selected, deleteNode }) {
  const { src, alt, title, width: initialWidth, height: initialHeight } = node.attrs
  const resolvedUrl = useSelector((state) => (src && src.startsWith(HYPERDRIVE_URL_PREFIX) ? getHyperdriveAddress(state, src) : src))
  
  const [width, setWidth] = useState(initialWidth || 300)
  const [height, setHeight] = useState(initialHeight || 'auto')
  const [aspectRatio, setAspectRatio] = useState(null)

  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    const ratio = naturalWidth / naturalHeight
    setAspectRatio(ratio)
    
    // If we have nothing, default to 300 width and calc height
    if (!initialWidth && !initialHeight) {
      setWidth(300)
      setHeight(300 / ratio)
    } else if (initialWidth && !initialHeight) {
      setHeight(initialWidth / ratio)
    }
  }

  const onResize = (event, { size }) => {
    if (aspectRatio) {
      const newWidth = size.width
      const newHeight = newWidth / aspectRatio
      setWidth(newWidth)
      setHeight(newHeight)
    } else {
      setWidth(size.width)
      setHeight(size.height)
    }
  }

  const onResizeStop = (event, { size }) => {
    const finalHeight = aspectRatio ? size.width / aspectRatio : size.height
    updateAttributes({ width: size.width, height: finalHeight })
  }

  const handleDelete = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (src && src.startsWith(HYPERDRIVE_URL_PREFIX)) {
      try {
        const key = src.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
        await backendApi.deleteFile(key)
      } catch (error) {
        console.error('Error deleting image from backend:', error)
      }
    }

    if (deleteNode) deleteNode()
  }

  return (
    <NodeViewWrapper 
      className="block relative my-4 w-fit" 
      draggable={!selected}
    >
      <div 
        className={`relative block transition-all rounded-lg ${selected ? 'ring-2 ring-accent-primary' : ''}`}
        onMouseDown={(e) => { if (selected) e.stopPropagation() }}
      >
        {selected && (
          <button
            onClick={handleDelete}
            className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-border-primary rounded-full shadow-lg flex items-center justify-center text-accent-danger hover:bg-accent-danger hover:text-white transition-colors z-30 pointer-events-auto"
            title="Delete Image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <Resizable
          width={typeof width === 'number' ? width : 300}
          height={typeof height === 'number' ? (height === 'auto' ? 200 : height) : 200}
          onResize={onResize}
          onResizeStop={onResizeStop}
          handle={
            selected ? (
              <div 
                onDragStart={(e) => e.preventDefault()}
                className="absolute right-[-6px] bottom-[-6px] w-4 h-4 bg-accent-primary border-2 border-white rounded-full cursor-se-resize z-30 shadow-md hover:scale-125 transition-transform" 
                contentEditable={false}
              />
            ) : <div />
          }
        >
          <div 
            style={{ width, height, position: 'relative', display: 'block' }} 
            contentEditable={false}
            onDragStart={(e) => e.preventDefault()}
          >
            <img
              src={resolvedUrl}
              alt={alt}
              title={title}
              onLoad={onImageLoad}
              draggable={false}
              className={`rounded-lg border border-border-primary w-full h-full block object-contain pointer-events-auto ${selected ? 'brightness-110' : ''}`}
            />
          </div>
        </Resizable>
      </div>
    </NodeViewWrapper>
  )
}
