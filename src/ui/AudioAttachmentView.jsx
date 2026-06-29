import { NodeViewWrapper } from '@tiptap/react'
import { Trash2, Download } from 'lucide-react'
import AudioPlayer from './AudioPlayer'
import { useSelector } from 'react-redux'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { deleteHyperdriveFile, base64ToBlob, createDownloadLink, downloadAsBlob } from '../lib/fileManager'

export default function AudioAttachmentView({ node, deleteNode }) {
  const { audioData, duration, url, fileName } = node.attrs
  const resolvedUrl = useSelector((state) => (url && url.startsWith(HYPERDRIVE_URL_PREFIX) ? getHyperdriveAddress(state, url) : url))

  const handleDownload = async (e) => {
    e.stopPropagation()
    const finalUrl = resolvedUrl || audioData
    if (!finalUrl) return

    try {
      const blob = finalUrl.startsWith('data:')
        ? base64ToBlob(finalUrl)
        : await downloadAsBlob(finalUrl)
      createDownloadLink(blob, fileName || `audio-${Date.now()}.webm`)
    } catch (error) {
      console.error('Error downloading audio:', error)
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()

    try {
      await deleteHyperdriveFile(url)
    } catch (error) {
      console.error('Error deleting audio from backend:', error)
    }

    if (deleteNode) deleteNode()
  }

  return (
    <NodeViewWrapper className='audio-attachment-wrapper my-4'>
      <div className='relative group'>
        <AudioPlayer 
          src={resolvedUrl || audioData} 
          duration={duration} 
          title={fileName || "Audio Recording"} 
        />
        
        <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20'>
          {(resolvedUrl || audioData) && (
            <button
              onClick={handleDownload}
              className='flex-shrink-0 p-2.5 rounded-lg hover:bg-bg-panel transition-all duration-200'
              title='Download'
            >
              <Download className='w-4 h-4 text-text-secondary hover:text-text-primary transition-colors' />
            </button>
          )}
          <button
            onClick={handleDelete}
            className='flex-shrink-0 p-2.5 rounded-lg hover:bg-accent-danger/10 transition-all duration-200'
            title='Delete'
          >
            <Trash2 className='w-4 h-4 text-accent-danger' />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  )
}
