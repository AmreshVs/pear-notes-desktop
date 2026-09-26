import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  HardDrive,
  Loader2,
  Pause,
  Play,
  Trash2,
  X
} from 'lucide-react'

import {
  canRunFeature,
  getFeatureLanguages,
  getFeatureRegistryNames,
  getFeatureTiers,
  getModelDocsUrl,
  getOnDemandModelNames,
  getRegistryNamesBytes,
  LOCAL_AI_DEVICE_STATUS,
  LOCAL_AI_ENABLED,
  LOCAL_AI_FEATURE_STATUS,
  LOCAL_AI_GROUPS,
  LOCAL_AI_LICENSE,
  LOCAL_AI_MODEL_STATUS,
  LOCAL_AI_NETWORK,
  LOCAL_AI_NOTICE,
  LOCAL_AI_REGISTRY_MODELS,
  QVAC_MODEL_LIBRARY_URL
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  cancelLocalAiFeatureDownload,
  clearLocalAiNotice,
  computeFeatureRow,
  computeModelUsers,
  computeReleasableBytes,
  computeReleasableNames,
  deleteAllLocalAiModels,
  deleteLocalAiModel,
  disableLocalAiFeature,
  downloadLocalAiModelNow,
  enableLocalAiFeature,
  getLocalAiState,
  initLocalAi,
  pauseLocalAiDownload,
  resumeLocalAiDownload,
  selectLocalAiBytesOnDisk,
  setLocalAiFeatureLanguage,
  setLocalAiFeatureTier,
  setLocalAiWifiOnly
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import {
  setShowAiTools,
  setShowAiToolsInLocked,
  useShowAiTools,
  useShowAiToolsInLocked
} from '../../lib/localAi/aiToolsPreference'

const SECTION_TITLE_CLASS = 'text-text-primary font-bold text-sm tracking-[0.1em] ml-2 mb-3'
const CARD_CLASS =
  'bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden divide-y divide-border-primary'
const ROW_CLASS =
  'p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors'
const LABEL_CLASS = 'block text-text-primary text-base font-bold'
const DESC_CLASS = 'text-sm text-text-tertiary font-medium opacity-60'
const ACTION_BUTTON_CLASS =
  'px-3 py-1.5 rounded-xl bg-accent-primary/10 text-accent-primary text-sm font-semibold hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const ICON_BUTTON_CLASS =
  'p-1.5 rounded-lg text-accent-primary hover:bg-accent-primary/10 transition-colors'
const MODAL_CANCEL_CLASS =
  'flex-1 py-3 px-4 bg-overlay-subtle border border-overlay-soft text-text-tertiary rounded-xl font-bold text-sm whitespace-nowrap hover:bg-overlay-medium transition-all active:scale-95'

const MODAL_PRIMARY_CLASS =
  'flex-1 py-3 px-4 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-sm whitespace-nowrap shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover transition-all active:scale-95'

const MODAL_DANGER_CLASS =
  'flex-1 py-3 px-4 bg-accent-danger text-white rounded-xl font-bold text-sm whitespace-nowrap shadow-[0_8px_25px_rgba(var(--accent-danger-rgb),0.25)] hover:opacity-90 transition-all active:scale-95'

const OPTION_CLASS =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors'
const MODEL_DELETE_CLASS =
  'p-1.5 rounded-lg hover:bg-accent-danger/10 text-text-tertiary hover:text-accent-danger transition-all ml-2 flex-shrink-0'

const DOWNLOAD_BLOCKING_NETWORKS = [
  LOCAL_AI_NETWORK.CELLULAR,
  LOCAL_AI_NETWORK.METERED,
  LOCAL_AI_NETWORK.OFFLINE
]

function optionClass(selected) {
  return `${OPTION_CLASS} ${selected ? 'bg-[var(--accent-selected-bg)] text-accent-primary border-[var(--accent-selected-border)]' : 'text-text-secondary border-border-primary hover:bg-overlay-light'}`
}

function buildModelRow(state, name) {
  const model = state.models[name]
  const expected = model?.totalBytes || LOCAL_AI_REGISTRY_MODELS[name]?.bytes || 0
  const bytes =
    !model || model.status === LOCAL_AI_MODEL_STATUS.READY
      ? expected
      : Math.min(model.downloadedBytes ?? 0, expected)
  return {
    name,
    bytes,
    license: LOCAL_AI_REGISTRY_MODELS[name]?.license ?? LOCAL_AI_LICENSE.PENDING,
    onDevice: !!model,
    users: computeModelUsers(state.config, name)
  }
}

function Toggle({ on, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}

function ConfirmModal({ icon: Icon, danger, title, message, onDismiss, children }) {
  return (
    <div className='fixed inset-0 z-[300] flex items-center justify-center p-6'>
      <div className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl' onClick={onDismiss} />
      <div className='relative bg-bg-panel/90 backdrop-blur-3xl border border-overlay-medium rounded-[2rem] p-8 max-w-sm w-full shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in duration-200'>
        <div className='flex flex-col items-center text-center space-y-4'>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-1 ${danger ? 'bg-accent-danger/10 ring-accent-danger/20' : 'bg-accent-primary/10 ring-accent-primary/20'}`}
          >
            <Icon className={`w-6 h-6 ${danger ? 'text-accent-danger' : 'text-accent-primary'}`} />
          </div>
          <div className='space-y-2'>
            <h3 className='text-lg font-bold text-text-primary'>{title}</h3>
            <p className='text-sm text-text-tertiary leading-relaxed'>{message}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function LocalAiSettings() {
  const { t } = useTranslation()
  // The footer names the model library mid-sentence, so the label is split out
  // of the translated string rather than the sentence being cut into pieces.
  const footerLibrary = t('settings.onDeviceAi.footerLibrary')
  const [footerBefore, footerAfter] = t('settings.onDeviceAi.footer').split(footerLibrary)
  const dispatch = useDispatch()
  const state = useSelector(getLocalAiState)
  const bytesOnDisk = useSelector(selectLocalAiBytesOnDisk)
  const [confirm, setConfirm] = useState(null)
  const [expandedFeature, setExpandedFeature] = useState(null)

  const showAiTools = useShowAiTools()
  const showAiToolsInLocked = useShowAiToolsInLocked()

  useEffect(() => {
    if (LOCAL_AI_ENABLED) dispatch(initLocalAi())
  }, [dispatch])

  const { loaded, device, config } = state
  const isUnsupported = device.status === LOCAL_AI_DEVICE_STATUS.UNSUPPORTED
  const notice = state.notice?.type === LOCAL_AI_NOTICE.INSUFFICIENT_SPACE ? state.notice : null

  const groups = useMemo(
    () =>
      LOCAL_AI_GROUPS.map((group) => ({
        id: group.id,
        features: group.features.map((feature) => computeFeatureRow(state, feature))
      })),
    [state]
  )

  const models = useMemo(() => {
    const names = new Set([...Object.keys(state.models), ...Object.keys(config.downloaded ?? {})])
    return [...names].map((name) => buildModelRow(state, name)).filter((row) => row.onDevice)
  }, [config.downloaded, state])

  const featureModelNames = (feature) => [
    ...getFeatureRegistryNames(feature, config.features[feature]),
    ...getOnDemandModelNames(feature, state.models)
  ]

  const featureTitles = (features) =>
    features.map((feature) => t(`settings.onDeviceAi.features.${feature}.title`)).join(', ')

  const modelUsage = (row) =>
    row.users.length
      ? t('settings.onDeviceAi.usedBy', { features: featureTitles(row.users) })
      : t('settings.onDeviceAi.unused')

  const featureLimitations = (feature) => {
    const items = t(`settings.onDeviceAi.features.${feature}.limitations`, {
      returnObjects: true,
      defaultValue: []
    })
    return Array.isArray(items) ? items : []
  }

  const licenseLabel = (row) =>
    t('settings.onDeviceAi.license', { license: t(`settings.onDeviceAi.licenses.${row.license}`) })

  const requestDeleteModel = (row) =>
    setConfirm({ kind: 'deleteModel', name: row.name, bytes: row.bytes, users: row.users })

  const handleConfirmDelete = () => {
    if (confirm.kind === 'deleteAll') dispatch(deleteAllLocalAiModels())
    else dispatch(deleteLocalAiModel({ name: confirm.name }))
    setConfirm(null)
  }

  const statusLabel = (row) => {
    const progress = {
      percent: row.percent,
      downloaded: formatBytes(row.downloadedBytes),
      total: formatBytes(row.totalBytes)
    }
    if (row.onDemand && row.status === LOCAL_AI_FEATURE_STATUS.OFF) {
      return t('settings.onDeviceAi.featureStatus.offOnDemand')
    }
    if (row.onDemand && row.status === LOCAL_AI_FEATURE_STATUS.READY) {
      return row.onDemandBytes
        ? t('settings.onDeviceAi.featureStatus.readyOnDemand', {
            size: formatBytes(row.onDemandBytes)
          })
        : t('settings.onDeviceAi.featureStatus.readyOnDemandEmpty')
    }
    switch (row.status) {
      case LOCAL_AI_FEATURE_STATUS.OFF:
        return row.missingBytes > 0
          ? t('settings.onDeviceAi.featureStatus.off', { size: formatBytes(row.missingBytes) })
          : t('settings.onDeviceAi.featureStatus.offDownloaded')
      case LOCAL_AI_FEATURE_STATUS.READY:
        return t('settings.onDeviceAi.featureStatus.ready', { size: formatBytes(row.totalBytes) })
      case LOCAL_AI_FEATURE_STATUS.DOWNLOADING:
        return t('settings.onDeviceAi.featureStatus.downloading', progress)
      case LOCAL_AI_FEATURE_STATUS.PAUSED:
        return t('settings.onDeviceAi.featureStatus.paused', progress)
      case LOCAL_AI_FEATURE_STATUS.WAITING_NETWORK:
        return t('settings.onDeviceAi.featureStatus.waitingNetwork', {
          size: formatBytes(row.missingBytes)
        })
      case LOCAL_AI_FEATURE_STATUS.FAILED:
        return t('settings.onDeviceAi.featureStatus.failed', { percent: row.percent })
      case LOCAL_AI_FEATURE_STATUS.NEEDS_MEMORY:
        return t('settings.onDeviceAi.featureStatus.needsMemory')
      default:
        return ''
    }
  }

  const handleToggleFeature = useCallback(
    (row) => {
      if (isUnsupported || !loaded) return
      if (!row.enabled) {
        if (row.missingBytes === 0) {
          dispatch(enableLocalAiFeature({ feature: row.feature }))
          return
        }
        setConfirm({
          kind: 'turnOn',
          feature: row.feature,
          bytes: row.missingBytes,
          waitsForNetwork: config.wifiOnly && DOWNLOAD_BLOCKING_NETWORKS.includes(state.network)
        })
        return
      }
      if (computeReleasableNames(state, row.feature).length === 0) {
        dispatch(disableLocalAiFeature({ feature: row.feature, deleteModels: false }))
        return
      }
      setConfirm({
        kind: 'turnOff',
        feature: row.feature,
        bytes: computeReleasableBytes(state, row.feature),
        waitsForNetwork: false
      })
    },
    [config.wifiOnly, dispatch, isUnsupported, loaded, state]
  )

  const handleConfirmTurnOn = () => {
    dispatch(enableLocalAiFeature({ feature: confirm.feature }))
    setConfirm(null)
  }

  const handleConfirmTurnOff = (deleteModels) => {
    dispatch(disableLocalAiFeature({ feature: confirm.feature, deleteModels }))
    setConfirm(null)
  }

  const handleToggleWifiOnly = () => {
    if (isUnsupported) return
    dispatch(setLocalAiWifiOnly(!config.wifiOnly))
  }

  const verdict = device.status
  const verdictText = isUnsupported
    ? t(`settings.onDeviceAi.unsupportedReason.${device.reason ?? 'store-build'}`, {
        requirement: t('settings.onDeviceAi.requirementMac')
      })
    : t(`settings.onDeviceAi.verdict.${verdict}`)

  const confirmFeature = confirm?.feature
    ? t(`settings.onDeviceAi.features.${confirm.feature}.inline`)
    : ''
  const confirmSize = confirm ? formatBytes(confirm.bytes) : ''

  const deleteText =
    confirm?.kind === 'deleteAll'
      ? {
          title: t('settings.onDeviceAi.deleteAllConfirm.title'),
          message: t('settings.onDeviceAi.deleteAllConfirm.message', { size: confirmSize })
        }
      : confirm?.kind === 'deleteModel'
        ? {
            title: t('settings.onDeviceAi.deleteModelConfirm.title', {
              model: t(`settings.onDeviceAi.modelNames.${confirm.name}`)
            }),
            message: confirm.users.length
              ? t('settings.onDeviceAi.deleteModelConfirm.messageUsers', {
                  size: confirmSize,
                  features: featureTitles(confirm.users)
                })
              : t('settings.onDeviceAi.deleteModelConfirm.message', { size: confirmSize })
          }
        : null

  if (!loaded) {
    return (
      <div className='max-w-2xl mx-auto'>
        <div className={CARD_CLASS}>
          <div className='px-6 py-8 flex items-center justify-center gap-3'>
            <Loader2 className='w-5 h-5 text-accent-primary animate-spin' />
            <span className={DESC_CLASS}>{t('settings.onDeviceAi.loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-12 max-w-2xl mx-auto'>
      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('settings.onDeviceAi.thisDevice')}</h3>
        <div className={CARD_CLASS}>
          <div className={ROW_CLASS}>
            <span className={DESC_CLASS}>{t('settings.onDeviceAi.status')}</span>
            <span className='text-sm font-bold text-text-primary'>
              {t(`settings.onDeviceAi.deviceStatus.${device.status}`)}
            </span>
          </div>
          <div className={ROW_CLASS}>
            <span className={DESC_CLASS}>{t('settings.onDeviceAi.memory')}</span>
            <span className='text-sm font-bold text-text-primary tabular-nums'>
              {formatBytes(device.totalMemoryBytes)}
            </span>
          </div>
          <div className={ROW_CLASS}>
            <span className={DESC_CLASS}>{t('settings.onDeviceAi.freeSpace')}</span>
            <span className='text-sm font-bold text-text-primary tabular-nums'>
              {formatBytes(device.freeDiskBytes)}
            </span>
          </div>
          <div className={ROW_CLASS}>
            <span className={DESC_CLASS}>{t('settings.onDeviceAi.modelsOnDevice')}</span>
            <span className='text-sm font-bold text-text-primary tabular-nums'>
              {formatBytes(bytesOnDisk)}
            </span>
          </div>
          <div className='p-6 flex items-start gap-3'>
            {verdict === LOCAL_AI_DEVICE_STATUS.SUPPORTED ? (
              <Check size={16} className='shrink-0 mt-0.5 text-green-500' />
            ) : (
              <AlertTriangle
                size={16}
                className={`shrink-0 mt-0.5 ${isUnsupported ? 'text-accent-danger' : 'text-accent-primary'}`}
              />
            )}
            <p className='text-sm text-text-secondary leading-relaxed'>{verdictText}</p>
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('settings.onDeviceAi.noteEditor')}</h3>
        <div className={CARD_CLASS}>
          <div className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={LABEL_CLASS}>{t('settings.onDeviceAi.showAiTools')}</label>
              <p className={DESC_CLASS}>{t('settings.onDeviceAi.showAiToolsDesc')}</p>
            </div>
            <Toggle on={showAiTools} onClick={() => setShowAiTools(!showAiTools)} />
          </div>
          <div className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={LABEL_CLASS}>{t('settings.onDeviceAi.showAiToolsInLocked')}</label>
              <p className={DESC_CLASS}>{t('settings.onDeviceAi.showAiToolsInLockedDesc')}</p>
            </div>
            <Toggle
              on={showAiToolsInLocked}
              onClick={() => setShowAiToolsInLocked(!showAiToolsInLocked)}
              disabled={!showAiTools}
            />
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('settings.onDeviceAi.downloads')}</h3>
        <div className={CARD_CLASS}>
          <div className={ROW_CLASS}>
            <div className='space-y-1 min-w-0'>
              <label className={LABEL_CLASS}>{t('settings.onDeviceAi.wifiOnly')}</label>
              <p className={DESC_CLASS}>{t('settings.onDeviceAi.wifiOnlyDesc')}</p>
            </div>
            <Toggle on={config.wifiOnly} onClick={handleToggleWifiOnly} disabled={isUnsupported} />
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.id} className='space-y-1'>
          <h3 className={SECTION_TITLE_CLASS}>{t(`settings.onDeviceAi.groups.${group.id}`)}</h3>
          <div className={CARD_CLASS}>
            {group.features.map((row) => {
              const showProgress =
                row.status === LOCAL_AI_FEATURE_STATUS.DOWNLOADING ||
                row.status === LOCAL_AI_FEATURE_STATUS.PAUSED
              return (
                <div
                  key={row.feature}
                  className='p-6 space-y-4 hover:bg-overlay-faint transition-colors'
                >
                  <div className='flex items-center justify-between gap-6'>
                    <button
                      onClick={() =>
                        setExpandedFeature((current) =>
                          current === row.feature ? null : row.feature
                        )
                      }
                      aria-expanded={expandedFeature === row.feature}
                      className='flex items-start gap-3 min-w-0 text-left'
                    >
                      {expandedFeature === row.feature ? (
                        <ChevronDown className='w-4 h-4 mt-1 text-text-tertiary flex-shrink-0' />
                      ) : (
                        <ChevronRight className='w-4 h-4 mt-1 text-text-tertiary flex-shrink-0' />
                      )}
                      <span className='space-y-1 min-w-0'>
                        <span className={LABEL_CLASS}>
                          {t(`settings.onDeviceAi.features.${row.feature}.title`)}
                        </span>
                        <span className={`block ${DESC_CLASS}`}>
                          {t(`settings.onDeviceAi.features.${row.feature}.desc`)}
                        </span>
                      </span>
                    </button>
                    <Toggle
                      on={row.enabled}
                      onClick={() => handleToggleFeature(row)}
                      disabled={
                        isUnsupported ||
                        (row.status === LOCAL_AI_FEATURE_STATUS.NEEDS_MEMORY && !row.enabled)
                      }
                    />
                  </div>

                  {!isUnsupported && (
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between gap-3'>
                        <span
                          className={`text-sm font-medium tabular-nums ${row.status === LOCAL_AI_FEATURE_STATUS.FAILED ? 'text-accent-danger' : 'text-text-tertiary'}`}
                        >
                          {statusLabel(row)}
                        </span>
                        <div className='flex items-center gap-1'>
                          {row.status === LOCAL_AI_FEATURE_STATUS.DOWNLOADING && (
                            <button
                              onClick={() =>
                                dispatch(pauseLocalAiDownload({ name: row.activeModel }))
                              }
                              className={ICON_BUTTON_CLASS}
                              aria-label={t('settings.onDeviceAi.pauseDownload')}
                              title={t('settings.onDeviceAi.pauseDownload')}
                            >
                              <Pause className='w-3.5 h-3.5' />
                            </button>
                          )}
                          {row.status === LOCAL_AI_FEATURE_STATUS.PAUSED && (
                            <button
                              onClick={() =>
                                dispatch(resumeLocalAiDownload({ name: row.activeModel }))
                              }
                              className={ICON_BUTTON_CLASS}
                              aria-label={t('settings.onDeviceAi.resumeDownload')}
                              title={t('settings.onDeviceAi.resumeDownload')}
                            >
                              <Play className='w-3.5 h-3.5' />
                            </button>
                          )}
                          {showProgress && (
                            <button
                              onClick={() =>
                                dispatch(cancelLocalAiFeatureDownload({ feature: row.feature }))
                              }
                              className='p-1.5 rounded-lg text-text-tertiary hover:bg-overlay-light transition-colors'
                              aria-label={t('settings.onDeviceAi.cancelDownload')}
                              title={t('settings.onDeviceAi.cancelDownload')}
                            >
                              <X className='w-3.5 h-3.5' />
                            </button>
                          )}
                          {row.status === LOCAL_AI_FEATURE_STATUS.WAITING_NETWORK && (
                            <button
                              onClick={() =>
                                dispatch(downloadLocalAiModelNow({ name: row.activeModel }))
                              }
                              className={ACTION_BUTTON_CLASS}
                            >
                              {t('settings.onDeviceAi.downloadNow')}
                            </button>
                          )}
                          {row.status === LOCAL_AI_FEATURE_STATUS.FAILED && (
                            <button
                              onClick={() =>
                                dispatch(resumeLocalAiDownload({ name: row.activeModel }))
                              }
                              className={ACTION_BUTTON_CLASS}
                            >
                              {t('settings.onDeviceAi.tryAgain')}
                            </button>
                          )}
                        </div>
                      </div>
                      {showProgress && (
                        <div className='h-1 rounded-full bg-overlay-medium overflow-hidden'>
                          <div
                            className={`h-full rounded-full transition-all ${row.status === LOCAL_AI_FEATURE_STATUS.PAUSED ? 'bg-text-tertiary' : 'bg-accent-primary'}`}
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {expandedFeature === row.feature && (
                    <div className='space-y-4 pl-7'>
                      {getFeatureLanguages(row.feature).length > 1 && (
                        <div className='space-y-2'>
                          <p className='text-sm font-bold text-text-primary'>
                            {t('settings.onDeviceAi.language')}
                          </p>
                          <div className='flex flex-wrap gap-2'>
                            {getFeatureLanguages(row.feature).map((language) => {
                              const selected = config.features[row.feature]?.language === language
                              return (
                                <button
                                  key={language}
                                  onClick={() =>
                                    dispatch(
                                      setLocalAiFeatureLanguage({ feature: row.feature, language })
                                    )
                                  }
                                  aria-pressed={selected}
                                  className={optionClass(selected)}
                                >
                                  {selected && <Check className='w-3.5 h-3.5' />}
                                  {t(`settings.onDeviceAi.languages.${language}`)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {getFeatureTiers(row.feature).length > 1 && (
                        <div className='space-y-2'>
                          <p className='text-sm font-bold text-text-primary'>
                            {t('settings.onDeviceAi.quality')}
                          </p>
                          <div className='flex flex-wrap gap-2'>
                            {getFeatureTiers(row.feature).map((tier) => {
                              const selected = config.features[row.feature]?.tier === tier
                              const bytes = getRegistryNamesBytes(
                                getFeatureRegistryNames(row.feature, {
                                  tier,
                                  language: config.features[row.feature]?.language
                                })
                              )
                              const fits = canRunFeature(
                                row.feature,
                                { ...config.features[row.feature], tier },
                                device.totalMemoryBytes
                              )
                              return (
                                <button
                                  key={tier}
                                  onClick={() =>
                                    dispatch(setLocalAiFeatureTier({ feature: row.feature, tier }))
                                  }
                                  title={
                                    fits ? undefined : t('settings.onDeviceAi.tierNeedsMemory')
                                  }
                                  aria-pressed={selected}
                                  aria-describedby={
                                    fits ? undefined : `${row.feature}-${tier}-memory`
                                  }
                                  className={optionClass(selected)}
                                >
                                  {selected && <Check className='w-3.5 h-3.5' />}
                                  {t(
                                    [
                                      `settings.onDeviceAi.features.${row.feature}.tierDescriptions.${tier}`,
                                      `settings.onDeviceAi.tierDescriptions.${tier}`
                                    ],
                                    {
                                      size: formatBytes(bytes)
                                    }
                                  )}
                                </button>
                              )
                            })}
                          </div>
                          {getFeatureTiers(row.feature)
                            .filter(
                              (tier) =>
                                !canRunFeature(
                                  row.feature,
                                  { ...config.features[row.feature], tier },
                                  device.totalMemoryBytes
                                )
                            )
                            .map((tier) => (
                              <p
                                key={tier}
                                id={`${row.feature}-${tier}-memory`}
                                className='text-sm text-accent-warning-text'
                              >
                                {t(`settings.onDeviceAi.tiers.${tier}`)}:{' '}
                                {t('settings.onDeviceAi.tierNeedsMemory')}
                              </p>
                            ))}
                          <p className={DESC_CLASS}>{t('settings.onDeviceAi.tierSwitchNote')}</p>
                        </div>
                      )}

                      {featureLimitations(row.feature).length > 0 && (
                        <div className='space-y-2'>
                          <p className='text-sm font-bold text-text-primary'>
                            {t('settings.onDeviceAi.limitations')}
                          </p>
                          <ul className='space-y-1.5 list-disc pl-5 marker:text-text-tertiary'>
                            {featureLimitations(row.feature).map((item) => (
                              <li key={item} className={DESC_CLASS}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className='space-y-1'>
                        <p className='text-sm font-bold text-text-primary'>
                          {t('settings.onDeviceAi.model')}
                        </p>
                        {featureModelNames(row.feature).length === 0 && (
                          <p className={DESC_CLASS}>{t('settings.onDeviceAi.noLanguagesYet')}</p>
                        )}
                        {featureModelNames(row.feature).map((name) => {
                          const model = buildModelRow(state, name)
                          const otherUsers = model.users.filter((user) => user !== row.feature)
                          return (
                            <div
                              key={name}
                              className='flex items-center justify-between py-2 px-3 rounded-xl hover:bg-overlay-subtle transition-colors'
                            >
                              <div className='min-w-0'>
                                <p className='text-sm text-text-secondary truncate'>
                                  {t(`settings.onDeviceAi.modelNames.${name}`)}
                                </p>
                                <p className='text-sm text-text-tertiary'>
                                  {`${formatBytes(model.bytes)} · ${licenseLabel(model)}`}
                                </p>
                                {model.onDevice && otherUsers.length > 0 && (
                                  <p className='text-sm text-text-tertiary'>
                                    {t('settings.onDeviceAi.sharedModel', {
                                      features: featureTitles(otherUsers)
                                    })}
                                  </p>
                                )}
                                {getModelDocsUrl(name) && (
                                  <a
                                    href={getModelDocsUrl(name)}
                                    target='_blank'
                                    rel='noreferrer'
                                    className='text-sm text-accent-primary hover:underline'
                                  >
                                    {t('settings.onDeviceAi.modelDocs')}
                                  </a>
                                )}
                              </div>
                              {!model.onDevice && (
                                <span className='text-sm text-text-tertiary flex-shrink-0 ml-4'>
                                  {t('settings.onDeviceAi.notDownloaded')}
                                </span>
                              )}
                              {model.onDevice && otherUsers.length === 0 && (
                                <button
                                  onClick={() => requestDeleteModel(model)}
                                  className={MODEL_DELETE_CLASS}
                                  aria-label={t('settings.onDeviceAi.deleteModel')}
                                  title={t('settings.onDeviceAi.deleteModel')}
                                >
                                  <Trash2 className='w-3.5 h-3.5' />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className='space-y-1'>
        <h3 className={SECTION_TITLE_CLASS}>{t('settings.onDeviceAi.modelsTitle')}</h3>
        <div className={CARD_CLASS}>
          {models.length === 0 ? (
            <div className={ROW_CLASS}>
              <p className={DESC_CLASS}>{t('settings.onDeviceAi.modelsEmpty')}</p>
            </div>
          ) : (
            models.map((row) => (
              <div key={row.name} className={ROW_CLASS}>
                <div className='space-y-1 min-w-0'>
                  <label className={LABEL_CLASS}>
                    {t(`settings.onDeviceAi.modelNames.${row.name}`)}
                  </label>
                  <p className={DESC_CLASS}>{`${formatBytes(row.bytes)} · ${modelUsage(row)}`}</p>
                  <p className={DESC_CLASS}>{licenseLabel(row)}</p>
                  {getModelDocsUrl(row.name) && (
                    <a
                      href={getModelDocsUrl(row.name)}
                      target='_blank'
                      rel='noreferrer'
                      className='text-sm text-accent-primary hover:underline'
                    >
                      {t('settings.onDeviceAi.modelDocs')}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => requestDeleteModel(row)}
                  className={MODEL_DELETE_CLASS}
                  aria-label={t('settings.onDeviceAi.deleteModel')}
                  title={t('settings.onDeviceAi.deleteModel')}
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            ))
          )}
          {models.length > 0 && (
            <div className='px-6 py-5 flex items-center justify-between gap-6'>
              <div className='space-y-1'>
                <p className='text-base font-bold text-text-primary'>
                  {t('settings.onDeviceAi.deleteAllModels')}
                </p>
                <p className='text-sm text-text-tertiary font-medium opacity-60'>
                  {t('settings.onDeviceAi.deleteAllModelsDesc')}
                </p>
              </div>
              <button
                onClick={() => setConfirm({ kind: 'deleteAll', bytes: bytesOnDisk, users: [] })}
                className='flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-sm font-bold hover:bg-accent-danger/20 transition-all active:scale-95 flex-shrink-0'
              >
                <Trash2 className='w-3.5 h-3.5' />
                {t('settings.onDeviceAi.deleteAllModels')}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className='text-sm text-text-tertiary font-medium opacity-60 leading-relaxed ml-2'>
        {footerBefore}
        <a
          href={QVAC_MODEL_LIBRARY_URL}
          target='_blank'
          rel='noreferrer'
          className='text-accent-primary hover:underline'
        >
          {footerLibrary}
        </a>
        {footerAfter}
      </p>

      {confirm?.kind === 'turnOn' && (
        <ConfirmModal
          icon={Download}
          title={t('settings.onDeviceAi.turnOn.title', { feature: confirmFeature })}
          message={
            confirm.waitsForNetwork
              ? t('settings.onDeviceAi.turnOn.messageWaiting', { size: confirmSize })
              : t('settings.onDeviceAi.turnOn.message', { size: confirmSize })
          }
          onDismiss={() => setConfirm(null)}
        >
          <div className='flex gap-3 w-full pt-2'>
            <button onClick={() => setConfirm(null)} className={MODAL_CANCEL_CLASS}>
              {t('common.cancel')}
            </button>
            <button onClick={handleConfirmTurnOn} className={MODAL_PRIMARY_CLASS}>
              {confirm.waitsForNetwork
                ? t('settings.onDeviceAi.turnOn.confirmWaiting')
                : t('settings.onDeviceAi.turnOn.confirm', { size: confirmSize })}
            </button>
          </div>
        </ConfirmModal>
      )}

      {confirm?.kind === 'turnOff' && (
        <ConfirmModal
          icon={HardDrive}
          title={t('settings.onDeviceAi.turnOff.title', { feature: confirmFeature })}
          message={t('settings.onDeviceAi.turnOff.message', { size: confirmSize })}
          onDismiss={() => setConfirm(null)}
        >
          <div className='flex flex-col gap-3 w-full pt-2'>
            <button onClick={() => handleConfirmTurnOff(false)} className={MODAL_CANCEL_CLASS}>
              {t('settings.onDeviceAi.turnOff.keep')}
            </button>
            <button onClick={() => handleConfirmTurnOff(true)} className={MODAL_DANGER_CLASS}>
              {t('settings.onDeviceAi.turnOff.delete')}
            </button>
            <button
              onClick={() => setConfirm(null)}
              className='py-2 text-text-tertiary text-sm font-semibold hover:text-text-primary transition-colors'
            >
              {t('common.cancel')}
            </button>
          </div>
        </ConfirmModal>
      )}

      {deleteText && (
        <ConfirmModal
          icon={Trash2}
          danger
          title={deleteText.title}
          message={deleteText.message}
          onDismiss={() => setConfirm(null)}
        >
          <div className='flex gap-3 w-full pt-2'>
            <button onClick={() => setConfirm(null)} className={MODAL_CANCEL_CLASS}>
              {t('common.cancel')}
            </button>
            <button onClick={handleConfirmDelete} className={MODAL_DANGER_CLASS}>
              {t('common.delete')}
            </button>
          </div>
        </ConfirmModal>
      )}

      {notice && (
        <ConfirmModal
          icon={AlertTriangle}
          danger
          title={t('settings.onDeviceAi.notEnoughSpace.title')}
          message={
            notice.feature
              ? t('settings.onDeviceAi.notEnoughSpace.message', {
                  feature: t(`settings.onDeviceAi.features.${notice.feature}.title`),
                  size: formatBytes(notice.requiredBytes ?? 0),
                  short: formatBytes(notice.shortBytes ?? 0)
                })
              : t('settings.onDeviceAi.notEnoughSpace.messageGeneric')
          }
          onDismiss={() => dispatch(clearLocalAiNotice())}
        >
          <div className='flex w-full pt-2'>
            <button onClick={() => dispatch(clearLocalAiNotice())} className={MODAL_CANCEL_CLASS}>
              {t('common.ok')}
            </button>
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}
