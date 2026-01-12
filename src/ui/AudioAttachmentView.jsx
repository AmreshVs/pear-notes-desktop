import { NodeViewWrapper } from '@tiptap/react'
import { Trash2, Download } from 'lucide-react'
import AudioPlayer from './AudioPlayer'

export default function AudioAttachmentView({ node, deleteNode }) {
  const { audioData, duration } = node.attrs

  const handleDownload = (e) => {
    e.stopPropagation()
    if (!audioData) return

    try {
      const byteString = atob(audioData.split(',')[1])
      const mimeString = audioData.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }

      const blob = new Blob([ab], { type: mimeString })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `audio-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading audio:', error)
    }
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (deleteNode) {
      deleteNode()
    }
  }

  return (
    <NodeViewWrapper className='audio-attachment-wrapper'>
      <div className='relative group'>
        <AudioPlayer 
          src={audioData} 
          duration={duration} 
          title="Audio Recording" 
        />
        
        {/* Action Buttons Overlay */}
        <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20'>
          {audioData && (
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
