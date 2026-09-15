import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

import { htmlToParagraphs } from '@pear-notes/core/store/services/localAiPrompts.js'

import { buildAiTools } from '../../lib/localAi/aiTools'
import { requestLocalAiSheet } from '../../lib/localAi/localAiRequests'

import AiToolsPanel from './AiToolsPanel'

export default function AiToolsButton({ content, summarizeReady, translateReady }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const tools = open ? buildAiTools({ summarizeReady, translateReady, hasSelection: false }) : []

  const handleChoose = (tool) => {
    setOpen(false)
    requestLocalAiSheet({ mode: tool.mode, paragraphs: htmlToParagraphs(content) })
  }

  return (
    <div className='relative'>
      {open && <div className='fixed inset-0 z-40' onMouseDown={() => setOpen(false)} />}

      {open && (
        <AiToolsPanel
          tools={tools}
          selectionText=''
          onChoose={handleChoose}
          onClose={() => setOpen(false)}
          className='absolute bottom-14 right-0 slide-in-from-bottom-2 origin-bottom-right'
        />
      )}

      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-label={t('localAi.writingTools.toolbarLabel')}
        title={t('localAi.writingTools.toolbarLabel')}
        className='relative z-50 w-11 h-11 rounded-full bg-accent-primary text-accent-on-primary shadow-lg shadow-accent-primary/25 flex items-center justify-center hover:bg-accent-primary/90 transition-all active:scale-95'
      >
        <Sparkles className='w-5 h-5' />
      </button>
    </div>
  )
}
