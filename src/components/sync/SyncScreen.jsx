import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Link2, X } from 'lucide-react'

export default function SyncScreen({ onClose }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('invite')
  const [inviteCode] = useState('abc123xyz789')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnect = () => {
    if (pasteCode.trim()) {
      alert('Connecting to device...')
      onClose()
    }
  }

  return (
    <div className='fixed inset-0 flex items-center justify-center z-50 p-6'>
      <div
        className='absolute inset-0 bg-backdrop-light backdrop-blur-sm animate-in fade-in duration-1000 cursor-pointer'
        onClick={onClose}
      />
      <div className='relative bg-bg-panel border border-border-secondary rounded-xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 ease-out'>
        <div className='bg-bg-panel-secondary border-b border-border-primary flex items-center justify-between px-6 py-4'>
          <h2 className='text-text-primary text-xl font-semibold'>{t('sync.title')}</h2>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-bg-panel-secondary hover:bg-bg-panel-tertiary flex items-center justify-center text-text-primary transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='flex border-b border-border-primary px-6 bg-bg-panel'>
          <button
            onClick={() => setActiveTab('invite')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'invite'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            {t('sync.tabs.link')}
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            {t('sync.tabs.devices')}
          </button>
        </div>

        <div className='p-6 bg-bg-panel'>
          {activeTab === 'invite' ? (
            <div>
              <h3 className='text-text-primary font-semibold text-lg mb-2'>
                {t('sync.hero.title')}
              </h3>
              <p className='text-sm mb-6 text-text-tertiary'>{t('sync.hero.description')}</p>

              <div className='flex gap-6'>
                <div className='w-48 h-48 bg-bg-panel-secondary rounded-lg flex items-center justify-center border border-border-tertiary'>
                  <div className='text-xs text-center text-text-tertiary'>
                    {t('sync.invite.qrTitle')}
                    <br />
                    {t('sync.invite.qrDescription')}
                  </div>
                </div>

                <div className='flex-1'>
                  <div className='bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4'>
                    <div className='flex items-start gap-3'>
                      <Check className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
                      <p className='text-green-600 dark:text-green-400 text-sm'>
                        {t('settings.e2eEncrypted')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyInvite}
                    className='w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl transition-colors font-bold text-base bg-accent-primary text-accent-on-primary hover:bg-accent-primary-hover shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] active:scale-95'
                  >
                    {copied ? (
                      <>
                        <Check className='w-4 h-4' />
                        {t('sync.invite.copied')}{' '}
                      </>
                    ) : (
                      <>
                        <Link2 className='w-4 h-4' />
                        {t('sync.invite.copyBtn')}{' '}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className='mt-8 pt-8 border-t border-border-primary'>
                <h3 className='text-text-primary font-semibold text-lg mb-2'>
                  {t('sync.paste.header')}
                </h3>
                <p className='text-sm mb-4 text-text-tertiary'>{t('sync.scanner.description')}</p>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    value={pasteCode}
                    onChange={(e) => setPasteCode(e.target.value)}
                    placeholder={t('sync.paste.placeholder')}
                    className='flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-tertiary text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary'
                  />
                  <button
                    onClick={handleConnect}
                    disabled={!pasteCode.trim()}
                    className='px-6 py-4 rounded-xl transition-colors font-bold text-base bg-accent-primary text-accent-on-primary hover:bg-accent-primary-hover disabled:bg-bg-panel-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] active:scale-95'
                  >
                    {t('sync.paste.linkBtn')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className='text-text-primary font-semibold text-lg mb-4'>
                {t('sync.tabs.devices')}
              </h3>
              <div className='space-y-3'>
                <div className='p-4 bg-bg-panel-secondary rounded-lg border border-border-tertiary'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-text-primary font-medium'>
                        {t('sync.devices.thisDevice')}
                      </p>
                      <p className='text-sm text-text-tertiary'>{t('sync.devices.empty')}</p>
                    </div>
                    <span className='px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full border border-green-500/20'>
                      {t('common.active', 'Active')}
                    </span>
                  </div>
                </div>
                <p className='text-sm text-center py-4 text-text-tertiary'>
                  {t('sync.devices.empty')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
