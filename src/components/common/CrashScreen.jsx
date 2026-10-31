import { useEffect, useState } from 'react'
import i18next from 'i18next'
import { AlertTriangle, Check, Copy, Loader2, RotateCcw, Send } from 'lucide-react'

import { copyToClipboard } from '../../lib/clipboard'
import { crashDetails, formatCrashReport } from '../../lib/crashReport'

const COPIED_RESET_MS = 2000

export default function CrashScreen({ crash, title, message, actionLabel, onAction }) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [sendState, setSendState] = useState('idle')
  const details = crashDetails(crash)
  const report = () => formatCrashReport(crash, { title, message })

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    if (await copyToClipboard(report())) setCopied(true)
  }

  const send = async (event) => {
    event.preventDefault()
    setSendState('sending')
    const sent = await window.electronBridge
      .sendCrashReport({ report: report(), email })
      .catch(() => false)
    setSendState(sent ? 'sent' : 'failed')
  }

  return (
    <div
      role='alertdialog'
      aria-labelledby='crash-title'
      className='fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-bg-primary'
    >
      <div className='relative bg-bg-panel border border-border-primary rounded-[2rem] p-10 max-w-2xl w-full max-h-full overflow-y-auto text-center'>
        <div className='flex flex-col items-center space-y-6'>
          <div className='w-20 h-20 bg-accent-danger/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-danger/30'>
            <AlertTriangle className='w-10 h-10 text-accent-danger' />
          </div>

          <div className='space-y-2'>
            <h3 id='crash-title' className='text-2xl font-bold text-text-primary tracking-tight'>
              {title}
            </h3>
            <p className='text-text-tertiary text-sm leading-relaxed whitespace-pre-line'>
              {message}
            </p>
          </div>

          {details && (
            <div className='w-full text-left space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-wide text-text-tertiary'>
                {i18next.t('crash.details')}
              </p>
              <pre className='w-full max-h-64 overflow-auto rounded-xl border border-border-primary bg-bg-primary p-4 text-xs font-mono text-text-secondary whitespace-pre-wrap break-words select-text'>
                {details}
              </pre>
            </div>
          )}

          <form onSubmit={send} className='w-full text-left space-y-2'>
            <p className='text-xs font-semibold uppercase tracking-wide text-text-tertiary'>
              {i18next.t('crash.sendTitle')}
            </p>
            {sendState === 'sent' ? (
              <p className='flex items-center gap-2 text-sm text-text-secondary' role='status'>
                <Check className='w-4 h-4 text-accent-primary' strokeWidth={2.5} />
                {i18next.t('crash.sent')}
              </p>
            ) : (
              <>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <input
                    type='email'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={i18next.t('crash.emailPlaceholder')}
                    aria-label={i18next.t('crash.emailPlaceholder')}
                    autoComplete='email'
                    className='flex-1 px-4 py-3 rounded-xl border border-border-primary bg-bg-primary text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary'
                  />
                  <button
                    type='submit'
                    disabled={sendState === 'sending'}
                    className='px-6 py-3 flex items-center justify-center gap-2 border border-border-primary text-text-primary rounded-xl font-bold text-sm hover:bg-bg-primary transition-all active:scale-95 disabled:opacity-60'
                  >
                    {sendState === 'sending' ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Send className='w-4 h-4' />
                    )}
                    {i18next.t(sendState === 'sending' ? 'crash.sending' : 'crash.send')}
                  </button>
                </div>
                <p
                  className={`text-xs ${sendState === 'failed' ? 'text-accent-danger' : 'text-text-tertiary'}`}
                  role={sendState === 'failed' ? 'alert' : undefined}
                >
                  {i18next.t(sendState === 'failed' ? 'crash.sendFailed' : 'crash.sendHint')}
                </p>
              </>
            )}
          </form>

          <div className='w-full flex flex-col sm:flex-row gap-3'>
            <button
              onClick={copy}
              className='flex-1 py-4 flex items-center justify-center gap-2 border border-border-primary text-text-primary rounded-xl font-bold text-base hover:bg-bg-primary transition-all active:scale-95'
            >
              {copied ? (
                <Check className='w-4 h-4' strokeWidth={2.5} />
              ) : (
                <Copy className='w-4 h-4' />
              )}
              {i18next.t(copied ? 'crash.copied' : 'crash.copy')}
            </button>
            <button
              onClick={onAction}
              className='flex-1 py-4 flex items-center justify-center gap-2 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-base hover:bg-accent-primary-hover transition-all active:scale-95'
            >
              <RotateCcw className='w-4 h-4' />
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
