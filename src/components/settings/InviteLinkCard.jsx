import { useTranslation } from 'react-i18next'
import { Check, Info, Link2, Loader2, ShieldCheck, Timer } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

import { INVITE_EXPIRY_MINUTES } from '@pear-notes/core/constant.js'
import { formatInviteCountdown } from '@pear-notes/core/utils.js'

export default function InviteLinkCard({ invite, copy, IdleIcon }) {
  const { t } = useTranslation()

  return (
    <>
    {!invite.isGenerated ? (
      <div className='bg-bg-secondary border border-border-primary rounded-2xl p-10 flex flex-col items-center text-center space-y-5 hover:border-border-secondary transition-colors'>
        <div className='w-20 h-20 bg-accent-primary/5 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/10 shadow-inner'>
          <IdleIcon className='w-10 h-10 text-accent-primary' />
        </div>
        <div className='space-y-2'>
          <h3 className='text-text-primary font-bold text-xl'>
            {invite.expired ? t('sync.invite.expiredTitle') : copy.idleTitle}
          </h3>
          <p className='text-text-tertiary text-sm max-w-sm leading-relaxed'>
            {invite.expired
              ? t('sync.invite.expiredDesc', { minutes: INVITE_EXPIRY_MINUTES })
              : copy.idleDesc}
          </p>
        </div>
        <button
          onClick={invite.generate}
          disabled={invite.isLoading}
          className='group relative px-10 py-4 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover active:scale-95'
        >
          <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity' />
          {invite.isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
          {invite.isLoading
            ? t('sync.hero.preparing')
            : invite.expired
              ? t('sync.invite.regenerateBtn')
              : copy.generateBtn}
        </button>
      </div>
    ) : (
      <div className='space-y-5'>
        <div className='bg-bg-secondary border border-border-primary rounded-2xl p-8 relative overflow-hidden'>
          <div className='absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-3xl rounded-full pointer-events-none' />

          <div className='flex items-center gap-3 mb-6'>
            <div className='w-10 h-10 bg-accent-primary/10 rounded-full flex items-center justify-center border border-accent-primary/20'>
              <ShieldCheck className='w-5 h-5 text-accent-primary' />
            </div>
            <div>
              <h4 className='text-text-primary font-semibold'>{copy.readyTitle}</h4>
              <p
                className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 mt-1 ${
                  invite.expiringSoon
                    ? 'text-accent-danger bg-accent-danger/10'
                    : 'text-accent-primary bg-accent-primary/10'
                }`}
              >
                <Timer className='w-3.5 h-3.5' />
                {t('sync.invite.expiresIn', {
                  countdown: formatInviteCountdown(invite.remainingMs)
                })}
              </p>
            </div>
          </div>

          <div className='flex flex-col items-center mb-6 space-y-4'>
            <div className='p-3 bg-white rounded-2xl shadow-sm'>
              <QRCodeCanvas
                value={invite.link}
                size={160}
                level={'H'}
                includeMargin={false}
              />
            </div>
            <div className='text-center space-y-1'>
              <h5 className='text-text-primary font-bold text-base'>
                {copy.qrTitle}
              </h5>
              <p className='text-text-tertiary text-sm leading-relaxed max-w-[280px]'>
                {copy.qrDescription}
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            <label className='text-xs tracking-wider font-bold text-text-tertiary ml-1'>
              {copy.codeLabel}
            </label>
            <div className='relative group'>
              <input
                type='text'
                readOnly
                value={invite.link}
                className='w-full px-4 py-3 bg-bg-panel/40 border border-border-primary rounded-xl text-text-primary font-mono text-base tracking-wider shadow-inner outline-none transition-all group-hover:border-border-primary'
              />
            </div>
          </div>

          <button
            onClick={invite.copy}
            className={`w-full flex items-center justify-center gap-2 mt-6 px-6 py-4 rounded-xl font-bold text-base transition-colors duration-300 shadow-[0_8px_25px_rgba(var(--accent-primary-rgb),0.25)] hover:bg-accent-primary-hover active:scale-95 ${
              invite.copied
                ? 'bg-accent-success text-white'
                : 'bg-accent-primary text-accent-on-primary'
            }`}
          >
            {invite.copied ? (
              <>
                <Check className='w-4 h-4' strokeWidth={2.5} /> {t('sync.invite.copied')}
              </>
            ) : (
              <>
                <Link2 className='w-4 h-4' /> {copy.copyBtn}
              </>
            )}
          </button>
        </div>

        <div className='bg-accent-primary/5 border border-accent-primary/10 rounded-xl p-4 flex gap-4 items-start'>
          <Info className='w-5 h-5 text-accent-primary shrink-0' />
          <p className='text-xs text-text-tertiary leading-relaxed'>
            {copy.warning}
          </p>
        </div>
      </div>
    )}
    </>
  )
}
