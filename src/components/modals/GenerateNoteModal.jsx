import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Copy, FilePlus2, Loader2, Sparkles, X } from 'lucide-react'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { WORK_EVENT } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import {
  buildGeneratedNote,
  buildGenerateInput,
  generatedToHtml
} from '@pear-notes/core/store/services/noteGenerate.js'
import { getLocalAiFeatureConfig } from '@pear-notes/core/store/slices/localAiSlice.js'
import { createNote, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import { useDialog } from '../../hooks/useDialog'
import { copyToClipboard } from '../../lib/clipboard'
import { cancelLocalAiTask, runNoteTask } from '../../lib/localAi/electronAdapter'

async function loadNote(key, notesData) {
  const stored = notesData?.[key]
  if (stored && !stored.bodyOmitted && typeof stored.note === 'string') return stored
  const response = await backendApi.getSingleNote({ key })
  return response?.data ?? stored ?? null
}

export default function GenerateNoteModal({ task, noteKeys, onClose }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const notesData = useSelector(getNotesData)
  const featureConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS)
  )
  const dialogRef = useDialog(onClose)
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('working')
  const [sources, setSources] = useState([])
  const snapshot = useRef({ notesData, featureConfig })

  useEffect(() => {
    let active = true
    ;(async () => {
      const notes = (
        await Promise.all(noteKeys.map((key) => loadNote(key, snapshot.current.notesData)))
      ).filter((note) => note && !note.locked)
      if (!active) return
      setSources(notes.map((note) => note.title?.trim() || t('noteCard.untitled')))
      const input = buildGenerateInput(notes, { untitled: t('noteCard.untitled') })
      const text = await runNoteTask(task, input, snapshot.current.featureConfig ?? {}, {
        onProgress: (event) => {
          if (active && event?.type === WORK_EVENT.TEXT) setOutput(event.text)
        }
      })
      if (!active) return
      setOutput(text)
      setStatus(text.trim() ? 'done' : 'failed')
    })().catch(() => active && setStatus('failed'))
    return () => {
      active = false
    }
  }, [noteKeys, t, task])

  const close = () => {
    if (status === 'working') cancelLocalAiTask().catch(() => {})
    onClose()
  }

  const title = t(`generate.titles.${task}`, { title: sources[0] ?? '', count: noteKeys.length })

  const save = () => {
    dispatch(
      createNote(
        buildGeneratedNote({
          task,
          output,
          sources,
          title,
          sourcesLabel: t('generate.sources')
        })
      )
    )
    onClose()
  }

  return (
    <div className='fixed inset-0 z-[300] flex items-center justify-center p-6'>
      <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl' onClick={close} />
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-label={title}
        tabIndex={-1}
        className='relative bg-bg-panel/90 backdrop-blur-3xl border border-overlay-medium rounded-[2rem] p-8 max-w-xl w-full max-h-[80vh] flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-200'
      >
        <div className='flex items-start gap-3'>
          <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary'>
            <Sparkles className='w-5 h-5' />
          </div>
          <div className='flex-1 min-w-0'>
            <h2 className='text-lg font-bold text-text-primary truncate'>{title}</h2>
            <p className='text-sm text-text-tertiary'>
              {t('generate.fromCount', { count: noteKeys.length })}
            </p>
          </div>
          <button
            type='button'
            onClick={close}
            aria-label={t('common.close')}
            className='w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='mt-5 flex-1 overflow-y-auto select-text'>
          {status === 'working' && !output && (
            <div className='flex items-center gap-2 py-6 text-sm text-text-secondary'>
              <Loader2 className='w-4 h-4 animate-spin' />
              {t('generate.working')}
            </div>
          )}
          {status === 'failed' && (
            <p className='py-6 text-sm text-accent-warning-text'>{t('generate.failed')}</p>
          )}
          {output && (
            <div
              className='prose prose-invert max-w-none text-sm text-text-primary'
              dangerouslySetInnerHTML={{ __html: generatedToHtml(task, output) }}
            />
          )}
        </div>

        <p className='mt-4 text-xs text-text-tertiary'>{t('generate.disclaimer')}</p>
        <div className='mt-3 flex justify-end gap-2'>
          <button
            type='button'
            onClick={() => copyToClipboard(output)}
            disabled={status !== 'done'}
            className='px-4 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-tertiary disabled:opacity-40 inline-flex items-center gap-2'
          >
            <Copy className='w-4 h-4' />
            {t('generate.copy')}
          </button>
          <button
            type='button'
            onClick={save}
            disabled={status !== 'done'}
            className='px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-40 inline-flex items-center gap-2'
          >
            <FilePlus2 className='w-4 h-4' />
            {t('generate.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
