import 'react-resizable/css/styles.css'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { Resizable } from 'react-resizable'
import { NodeViewWrapper } from '@tiptap/react'
import { ScanText, Sparkles, Trash2 } from 'lucide-react'

import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import { useLocalAiFeatureReady } from '../../hooks/useLocalAiFeatureReady'
import { deleteHyperdriveFile } from '../../lib/fileManager'
import { requestLocalAiSheet } from '../../lib/localAi/localAiRequests'
import MediaPreviewModal from '../modals/MediaPreviewModal'

export default function ImageView({ node, updateAttributes, selected, deleteNode }) {
  const { t } = useTranslation()
  const { src, alt, title, width: initialWidth, height: initialHeight } = node.attrs
  const resolvedUrl = useSelector((state) =>
    src && src.startsWith(HYPERDRIVE_URL_PREFIX) ? getHyperdriveAddress(state, src) : src
  )
  const noteKey = useSelector(getSelectedNote)
  const extractTextReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.EXTRACT_TEXT)
  const describeImagesReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.DESCRIBE_IMAGES)

  const [width, setWidth] = useState(initialWidth || 300)
  const [height, setHeight] = useState(initialHeight || 'auto')
  const [aspectRatio, setAspectRatio] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const openPreview = () => setIsPreviewOpen(true)
  const closePreview = () => setIsPreviewOpen(false)

  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target
    const ratio = naturalWidth / naturalHeight
    setAspectRatio(ratio)

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

    try {
      await deleteHyperdriveFile(noteKey, src)
    } catch (error) {
      console.error('Error deleting image from backend:', error)
    }

    if (deleteNode) deleteNode()
  }

  return (
    <NodeViewWrapper className='block relative my-4 w-fit' draggable={!selected}>
      <div
        className='relative block transition-all rounded-lg'
        onMouseDown={(e) => {
          if (selected) e.stopPropagation()
        }}
      >
        {selected && (
          <button
            onClick={handleDelete}
            className='absolute -top-3 -right-3 w-8 h-8 bg-white border border-border-primary rounded-full shadow-lg flex items-center justify-center text-accent-danger hover:bg-accent-danger hover:text-white transition-colors z-30 pointer-events-auto'
            title={t('imageView.deleteImage')}
          >
            <Trash2 className='w-4 h-4' />
          </button>
        )}
        {selected && extractTextReady && resolvedUrl && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              requestLocalAiSheet({ mode: 'extract', url: resolvedUrl, fileName: title || alt })
            }}
            className='absolute -top-3 right-7 w-8 h-8 bg-white border border-border-primary rounded-full shadow-lg flex items-center justify-center text-text-secondary hover:bg-accent-primary hover:text-white transition-colors z-30 pointer-events-auto'
            title={t('localAi.extract.actionLabel')}
            aria-label={t('localAi.extract.actionLabel')}
          >
            <ScanText className='w-4 h-4' />
          </button>
        )}
        {selected && describeImagesReady && resolvedUrl && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              requestLocalAiSheet({
                mode: 'describe',
                url: resolvedUrl,
                fileName: title || alt,
                attachmentUrl: src
              })
            }}
            className={`absolute -top-3 ${extractTextReady ? 'right-[4.25rem]' : 'right-7'} w-8 h-8 bg-white border border-border-primary rounded-full shadow-lg flex items-center justify-center text-text-secondary hover:bg-accent-primary hover:text-white transition-colors z-30 pointer-events-auto`}
            title={t('localAi.describe.actionLabel')}
            aria-label={t('localAi.describe.actionLabel')}
          >
            <Sparkles className='w-4 h-4' />
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
                className='absolute right-[-6px] bottom-[-6px] w-4 h-4 bg-accent-primary border-2 border-white rounded-full cursor-se-resize z-30 shadow-md hover:scale-125 transition-transform'
                contentEditable={false}
              />
            ) : (
              <div />
            )
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
              onDoubleClick={openPreview}
              draggable={false}
              className={`rounded-lg w-full h-full block object-contain pointer-events-auto cursor-zoom-in ${selected ? 'border-2 border-accent-primary brightness-110' : 'border border-border-primary'}`}
            />
          </div>
        </Resizable>
      </div>
      {isPreviewOpen && (
        <MediaPreviewModal
          url={resolvedUrl}
          fileName={title || alt || t('imageView.imageDefault')}
          fileType='image/*'
          onClose={closePreview}
        />
      )}
    </NodeViewWrapper>
  )
}
