import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import {
  getIndexProgress,
  loadIndexBytes,
  nextIndexSample
} from '@pear-notes/core/store/services/localAiIndexProgress.js'
import {
  getAiSuggestions,
  getLocalAiIndex,
  loadAiSuggestionPrefs,
  rebuildLocalAiIndex,
  selectIndexCoverage,
  setAiSuggestion
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import {
  CARD_CLASS,
  DESC_CLASS,
  LABEL_CLASS,
  ROW_CLASS,
  SECTION_TITLE_CLASS
} from './localAiSettingsStyles'
import SettingsToggle from './SettingsToggle'

const MINUTE_MS = 60 * 1000
const SUGGESTION_ROWS = [
  AI_SUGGESTION.TASKS,
  AI_SUGGESTION.TITLES,
  AI_SUGGESTION.FOLDERS,
  AI_SUGGESTION.RELATED
]

function useIndexView() {
  const index = useSelector(getLocalAiIndex)
  const coverage = useSelector(selectIndexCoverage)
  const [sample, setSample] = useState(null)
  const [bytes, setBytes] = useState(null)
  const nextSample = nextIndexSample(sample, index)
  if (nextSample !== sample) setSample(nextSample)
  const progress = getIndexProgress({ index, coverage, sample: nextSample })

  useEffect(() => {
    if (!index.enabled) return
    let live = true
    loadIndexBytes(backendApi)
      .then((value) => live && setBytes(value))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [index.enabled, index.changedAt])

  return { index, coverage, progress, bytes }
}

function IndexCard() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { index, coverage, progress, bytes } = useIndexView()
  const busy = index.status === 'running' || index.status === 'waiting'
  const status =
    index.status === 'running'
      ? t('settings.onDeviceAi.index.running', { done: index.done ?? 0, total: index.total ?? 0 })
      : index.status === 'waiting'
        ? t('settings.onDeviceAi.index.waiting')
        : index.status === 'failed' || index.status === 'model-missing'
          ? t('settings.onDeviceAi.index.failed')
          : coverage
            ? t(
                coverage.indexed < coverage.total
                  ? 'settings.onDeviceAi.index.partial'
                  : 'settings.onDeviceAi.index.done',
                coverage
              )
            : t('settings.onDeviceAi.index.notYet')
  const timeLeft =
    progress.remainingMs == null
      ? null
      : progress.remainingMs < MINUTE_MS
        ? t('settings.onDeviceAi.index.lessThanMinute')
        : t('settings.onDeviceAi.index.minutesLeft', {
            count: Math.round(progress.remainingMs / MINUTE_MS)
          })

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-center justify-between gap-6'>
        <div className='space-y-1 min-w-0'>
          <label className={LABEL_CLASS}>{t('settings.onDeviceAi.index.title')}</label>
          <p className={DESC_CLASS} role='status'>
            {status}
          </p>
        </div>
        <button
          onClick={() => dispatch(rebuildLocalAiIndex())}
          disabled={busy}
          className='px-4 py-2 rounded-xl bg-bg-tertiary text-text-primary text-sm font-semibold hover:bg-bg-tertiary/70 disabled:opacity-40 whitespace-nowrap'
        >
          {t('settings.onDeviceAi.index.rebuild')}
        </button>
      </div>
      {progress.total > 0 && (
        <div className='space-y-2'>
          <div
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-label={t('settings.onDeviceAi.index.title')}
            className='h-1.5 rounded-full bg-bg-tertiary overflow-hidden'
          >
            <div
              className='h-full rounded-full bg-accent-primary transition-[width] duration-500'
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className='flex items-center justify-between gap-4 text-xs text-text-tertiary tabular-nums'>
            <span>
              {[t('settings.onDeviceAi.index.percent', { percent: progress.percent }), timeLeft]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {bytes != null && (
              <span>{t('settings.onDeviceAi.index.size', { size: formatBytes(bytes) })}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SuggestionsCard() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const prefs = useSelector(getAiSuggestions)

  useEffect(() => {
    dispatch(loadAiSuggestionPrefs())
  }, [dispatch])

  return (
    <div className='space-y-1'>
      <h3 className={SECTION_TITLE_CLASS}>{t('settings.onDeviceAi.suggestions.title')}</h3>
      <div className={CARD_CLASS}>
        {SUGGESTION_ROWS.map((kind) => (
          <div key={kind} className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={LABEL_CLASS}>{t(`settings.onDeviceAi.suggestions.${kind}`)}</label>
              <p className={DESC_CLASS}>{t(`settings.onDeviceAi.suggestions.${kind}Desc`)}</p>
            </div>
            <SettingsToggle
              on={prefs[kind] !== false}
              label={t(`settings.onDeviceAi.suggestions.${kind}`)}
              onClick={() => dispatch(setAiSuggestion({ kind, on: prefs[kind] === false }))}
            />
          </div>
        ))}
      </div>
      <p className='text-xs text-text-tertiary ml-2 pt-2'>
        {t('settings.onDeviceAi.suggestions.synced')}
      </p>
    </div>
  )
}

export default function LocalAiNotesSection({ indexEnabled }) {
  const { t } = useTranslation()
  return (
    <>
      {indexEnabled && (
        <div className='space-y-1'>
          <h3 className={SECTION_TITLE_CLASS}>{t('settings.onDeviceAi.yourNotes')}</h3>
          <div className={CARD_CLASS}>
            <IndexCard />
          </div>
        </div>
      )}
      <SuggestionsCard />
    </>
  )
}
