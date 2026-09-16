import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { WORK_STEP_STATUS } from '@pear-notes/core/store/services/localAiWorkProgress.js'

import LocalAiShimmer from './LocalAiShimmer'

const TRANSLATION_MODEL_PREFIX = 'BERGAMOT_'
const NUMBER_FORMAT = new Intl.NumberFormat()

function formatStepLabel(step, t) {
  const { key, params } = step.label
  const model = String(params.model ?? '')
  const modelName =
    model && !model.startsWith(TRANSLATION_MODEL_PREFIX)
      ? t(`settings.onDeviceAi.modelNames.${model}`, { defaultValue: '' })
      : ''
  if (params.model !== undefined && !modelName) {
    return t(
      step.status === WORK_STEP_STATUS.DONE
        ? 'localAi.work.steps.modelReadyGeneric'
        : 'localAi.work.steps.loadModel'
    )
  }
  return t(`localAi.work.steps.${key}`, {
    ...params,
    model: modelName,
    ...(params.characters !== undefined
      ? { characters: NUMBER_FORMAT.format(Number(params.characters)) }
      : {})
  })
}

function formatDetail(view, t, languageName) {
  const detail = view.detail
    ? t(`localAi.work.detail.${view.detail.key}`, {
        ...view.detail.params,
        ...(view.detail.params.from !== undefined
          ? {
              from: languageName(view.detail.params.from),
              to: languageName(view.detail.params.to)
            }
          : {})
      })
    : ''
  if (view.elapsedSeconds === null) return detail
  return detail
    ? t('localAi.work.detail.withElapsed', { detail, seconds: view.elapsedSeconds })
    : t('localAi.work.detail.elapsed', { seconds: view.elapsedSeconds })
}

export default function LocalAiWorkProgress({ view, languageName }) {
  const { t } = useTranslation()
  const hasFraction = view.fraction !== null
  const percent = Math.round((view.fraction ?? 0) * 100)
  const detail = formatDetail(view, t, languageName)

  const activeIndex = Math.max(
    view.steps.findIndex((step) => step.status === WORK_STEP_STATUS.ACTIVE),
    0
  )
  const activeStep = view.steps[activeIndex]
  const label = activeStep ? formatStepLabel(activeStep, t) : ''
  const current = activeIndex + 1
  const total = view.steps.length

  return (
    <div className='flex flex-col gap-3 py-1'>
      <div
        className='flex items-center gap-2.5 min-w-0'
        role='status'
        aria-label={t('localAi.work.stepAccessibility', { label, current, total })}
      >
        <Loader2
          className='w-4 h-4 shrink-0 text-accent-primary animate-spin motion-reduce:animate-none'
          aria-hidden='true'
        />
        <span
          className='flex-1 text-sm font-semibold text-text-primary truncate'
          aria-hidden='true'
        >
          {label}
        </span>
        {total > 1 && (
          <span
            className='shrink-0 text-xs font-medium text-text-tertiary tabular-nums'
            aria-hidden='true'
          >
            {t('localAi.work.stepCount', { current, total })}
          </span>
        )}
      </div>

      {hasFraction && (
        <div
          role='progressbar'
          aria-label={t('localAi.work.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className='h-1 rounded-full bg-overlay-medium overflow-hidden'
        >
          <div
            className='h-full rounded-full bg-accent-primary transition-all motion-reduce:transition-none'
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {detail && <p className='text-xs font-medium text-text-secondary tabular-nums'>{detail}</p>}

      {view.preview ? (
        <div
          aria-label={t('localAi.work.previewLabel')}
          className='rounded-xl bg-bg-tertiary/40 border border-overlay-soft px-4 py-3'
        >
          <p className='text-sm leading-relaxed text-text-tertiary whitespace-pre-wrap'>
            {view.preview}
          </p>
        </div>
      ) : (
        <LocalAiShimmer />
      )}
    </div>
  )
}
