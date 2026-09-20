import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'

import { useLocalAiFeatureReady } from '../../hooks/useLocalAiFeatureReady'
import { keepSelection, keptSelectionRange } from '../../lib/keptSelection'
import { buildAiTools } from '../../lib/localAi/aiTools'
import { requestLocalAiSheet } from '../../lib/localAi/localAiRequests'

import AiToolsPanel from './AiToolsPanel'

const toLines = (text) =>
  String(text ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

function readSelection(editor) {
  if (!editor || editor.isDestroyed) return null
  const live = editor.state.selection
  const range = live.empty ? keptSelectionRange(editor.state) : { from: live.from, to: live.to }
  if (!range) return null
  const text = editor.state.doc.textBetween(range.from, range.to, '\n', ' ')
  return text.trim() ? { from: range.from, to: range.to, text } : null
}

export default function SelectionAiTools({ editor }) {
  const { t } = useTranslation()
  const summarizeReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  const translateReady = useLocalAiFeatureReady(LOCAL_AI_FEATURE.TRANSLATE_NOTES)
  const [selection, setSelection] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!selection || !editor) return
    const handleSelectionUpdate = () => setSelection(null)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelection(null)
    }
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setSelection(null)
    }
    editor.on('selectionUpdate', handleSelectionUpdate)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [editor, selection])

  if (!summarizeReady && !translateReady) return null

  const tools = selection ? buildAiTools({ summarizeReady, translateReady, hasSelection: true }) : []

  const handleToggle = () => {
    setSelection((current) => (current ? null : readSelection(editor)))
  }

  const handleChoose = (tool) => {
    const target = selection
    setSelection(null)
    if (!target) return
    keepSelection(editor, target)
    requestLocalAiSheet({
      mode: tool.mode,
      paragraphs: toLines(target.text),
      scope: 'selection',
      selection: target
    })
  }

  return (
    <div ref={rootRef} className='relative flex items-center'>
      <div className='w-px h-5 bg-border-primary mx-1' />
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleToggle}
        aria-expanded={!!selection}
        aria-haspopup='dialog'
        aria-label={t('localAi.writingTools.selectionToolbarLabel')}
        title={t('localAi.writingTools.selectionToolbarLabel')}
        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm font-bold transition-colors ${
          selection
            ? 'bg-accent-primary text-accent-on-primary'
            : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20'
        }`}
      >
        <Sparkles className='w-4 h-4' strokeWidth={2.5} />
        {t('localAi.writingTools.editLabel')}
      </button>
      {selection && (
        <AiToolsPanel
          tools={tools}
          selectionText={selection.text}
          onChoose={handleChoose}
          onClose={() => setSelection(null)}
          className='absolute top-full right-0 mt-2 slide-in-from-top-2 origin-top-right'
        />
      )}
    </div>
  )
}
