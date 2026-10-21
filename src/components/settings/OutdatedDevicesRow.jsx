import { useTranslation } from 'react-i18next'
import { Monitor, ShieldPlus, Smartphone } from 'lucide-react'

const DAY_MS = 24 * 60 * 60 * 1000

function deviceMeta(device, t) {
  const parts = []
  if (device.appVersion) {
    parts.push(t('settings.privacy.outdatedDeviceVersion', { version: device.appVersion }))
  }
  if (device.lastSeenAt) {
    const days = Math.max(0, Math.floor((Date.now() - device.lastSeenAt) / DAY_MS))
    parts.push(
      days === 0
        ? t('settings.privacy.outdatedDeviceSeenToday')
        : t('settings.privacy.outdatedDeviceSeen', { count: days })
    )
  }
  return parts.join(' · ')
}

function DeviceChip({ device }) {
  const { t } = useTranslation()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone
  const meta = deviceMeta(device, t)
  return (
    <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-tertiary/50 border border-border-primary text-xs font-bold text-text-secondary'>
      <Icon className='w-3.5 h-3.5 text-text-tertiary' />
      {device.title || '?'}
      {meta && <span className='font-medium text-text-tertiary'>{meta}</span>}
    </span>
  )
}

export default function OutdatedDevicesRow({ devices }) {
  const { t } = useTranslation()

  return (
    <div className='p-6 flex items-start gap-4 border-b border-border-primary'>
      <div className='flex-shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center'>
        <ShieldPlus className='w-5 h-5 text-accent-primary' />
      </div>
      <div className='space-y-2 min-w-0'>
        <div className='space-y-1'>
          <p className='text-text-primary text-base font-bold'>
            {t('settings.privacy.outdatedDevices')}
          </p>
          <p className='text-sm text-text-tertiary font-medium opacity-60'>
            {t('settings.privacy.outdatedDevicesDesc')}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {devices.map((device) => (
            <DeviceChip key={device.key || device.title} device={device} />
          ))}
        </div>
      </div>
    </div>
  )
}
