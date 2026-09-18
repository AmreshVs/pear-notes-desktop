import { useTranslation } from 'react-i18next'
import { AudioLines, Loader2, RotateCw, Square, X } from 'lucide-react'

import { useLiveDictation } from '../../hooks/useLiveDictation'
import { formatTime } from '../../utils/formatters'

const LEVEL_BARS = [0.55, 0.8, 1, 0.8, 0.55]
const MIN_BAR_PX = 4
const MAX_BAR_PX = 18

const STATUS_KEYS = {
  preparing: 'localAi.dictate.preparing.title',
  recording: 'localAi.dictate.recording.title',
  finishing: 'localAi.dictate.working.title'
}

const ERROR_KEYS = {
  micDenied: 'localAi.errors.micDenied.title',
  notEnoughMemory: 'localAi.errors.notEnoughMemory.title',
  dictationFailed: 'localAi.errors.dictationFailed.title',
  empty: 'localAi.errors.empty.title',
  failed: 'localAi.errors.failed.title'
}

const ICON_BUTTON_CLASS =
  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-text-primary hover:bg-bg-tertiary/60 transition-all active:scale-95 duration-200'
const PRIMARY_BUTTON_CLASS =
  'h-9 px-3 rounded-lg flex items-center gap-2 flex-shrink-0 bg-accent-primary text-accent-on-primary font-semibold text-sm hover:bg-accent-primary-hover transition-all active:scale-95 duration-200'

function LevelMeter({ level }) {
  const renderBar = (weight, index) => (
    <span
      key={index}
      className='w-[3px] rounded-full bg-accent-primary transition-[height] duration-100'
      style={{ height: `${Math.max(MIN_BAR_PX, Math.round(level * weight * MAX_BAR_PX))}px` }}
    />
  )
  return (
    <span className='flex items-center gap-[3px] h-5' aria-hidden='true'>
      {LEVEL_BARS.map(renderBar)}
    </span>
  )
}

export default function DictationBar({ editor, onDone, onAttachAudio }) {
  const { t } = useTranslation()
  const {
    phase,
    error,
    elapsed,
    level,
    isRecording,
    isBusy,
    isError,
    canAttachAudio,
    handleStop,
    handleCancel,
    handleRetry,
    handleAttachAudio
  } = useLiveDictation(editor, { onDone, onAttachAudio })

  const status = isError ? t(ERROR_KEYS[error] ?? ERROR_KEYS.failed) : t(STATUS_KEYS[phase])

  return (
    <div
      role='toolbar'
      aria-label={t('localAi.dictate.toolbarLabel')}
      className='flex items-center gap-2 px-2 py-1.5 rounded-xl bg-bg-panel/90 backdrop-blur-xl border border-border-primary shadow-md w-fit relative z-50'
    >
      <button
        onClick={handleCancel}
        title={t('common.cancel')}
        aria-label={t('common.cancel')}
        className={ICON_BUTTON_CLASS}
      >
        <X className='w-4 h-4' strokeWidth={2.5} />
      </button>

      <div className='flex items-center gap-3 min-w-[180px] px-1'>
        {isRecording && <LevelMeter level={level} />}
        {isBusy && <Loader2 className='w-4 h-4 animate-spin text-accent-primary' />}
        <span
          className={`text-sm font-medium truncate ${isError ? 'text-accent-danger' : 'text-text-secondary'}`}
          aria-live='polite'
        >
          {status}
        </span>
        {isRecording && (
          <span className='text-sm font-semibold tabular-nums text-text-primary'>
            {formatTime(Math.floor(elapsed / 1000))}
          </span>
        )}
      </div>

      {isError && canAttachAudio && (
        <button
          onClick={handleAttachAudio}
          title={t('localAi.actions.attachAudio')}
          aria-label={t('localAi.actions.attachAudio')}
          className={ICON_BUTTON_CLASS}
        >
          <AudioLines className='w-4 h-4' strokeWidth={2.5} />
        </button>
      )}

      {isError && error !== 'micDenied' && (
        <button onClick={handleRetry} className={PRIMARY_BUTTON_CLASS}>
          <RotateCw className='w-4 h-4' strokeWidth={2.5} />
          {t('localAi.actions.again')}
        </button>
      )}

      {isRecording && (
        <button onClick={handleStop} className={PRIMARY_BUTTON_CLASS}>
          <Square className='w-3.5 h-3.5 fill-current' strokeWidth={2.5} />
          {t('localAi.dictate.stop')}
        </button>
      )}
    </div>
  )
}
