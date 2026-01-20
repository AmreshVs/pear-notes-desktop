import { Link2, Check, Info, Monitor, Smartphone, Plus } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createInvite, getInvite, getInviteExpiresAt, getSyncIsLoading, subscribePairUser, getInviterStatus } from '../store/slices/syncSlice'
import { setShowSettings } from '../store/slices/uiSlice'

export default function SyncSettings() {
  const dispatch = useDispatch()
  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const { step } = useSelector(getInviterStatus)
  
  const isInviteGenerated = !!inviteCode
  
  const [syncTab, setSyncTab] = useState('invite')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')

  const handleCopyInvite = () => {
    if (!isInviteGenerated) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateInvite = () => {
    dispatch(createInvite())
  }

  const handleConnect = () => {
    if (pasteCode.trim()) {
      dispatch(subscribePairUser({ invite: pasteCode.trim() }))
      setPasteCode('')
      dispatch(setShowSettings(false))
    }
  }

  const formatExpiration = (timestamp) => {
    if (!timestamp) return ''
    const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
    const date = new Date(ms)
    if (isNaN(date.getTime())) return ''
    return `Expires at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className='grow overflow-y-auto'>
      <div className='max-w-xl mx-auto p-8 space-y-8'>
        <div className='flex border-b border-border-primary'>
          <button
            onClick={() => setSyncTab('invite')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              syncTab === 'invite'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            Invite a New Device
          </button>
          <button
            onClick={() => setSyncTab('manage')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              syncTab === 'manage'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            Manage Connected Devices
          </button>
        </div>

        {syncTab === 'invite' ? (
          <div className='py-4 animate-in fade-in duration-300'>
            <h3 className='text-text-primary font-semibold text-lg mb-2'>
              Share this invite with another device
            </h3>
            <p className='text-sm mb-8 text-text-tertiary'>
              Generate an invite link to connect another device running the app. 
              All your notes will be synced securely with end-to-end encryption.
            </p>

            <div className='space-y-6'>
              {!isInviteGenerated ? (
                <article className='bg-bg-panel-secondary border border-border-tertiary rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4'>
                  <div className='w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center'>
                    <Plus className='w-8 h-8 text-accent-primary' />
                  </div>
                  <div>
                    <h4 className='text-text-primary font-medium'>Ready to sync?</h4>
                    <p className='text-text-tertiary text-sm max-w-xs mx-auto'>
                      Create an invite code to securely link your other devices.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateInvite}
                    disabled={isLoading}
                    className='px-8 py-3 rounded-lg transition-all font-medium bg-accent-primary text-text-primary hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-accent-primary/20'
                  >
                    {isLoading ? 'Generating Invitation...' : 'Create Invite'}
                  </button>
                </article>
              ) : (
                <div className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                  <div className='bg-accent-success/10 border border-accent-success/20 rounded-lg p-4'>
                    <div className='flex items-start gap-3'>
                      <Check className='w-5 h-5 text-accent-success flex-shrink-0 mt-0.5' />
                      <p className='text-accent-success text-sm'>
                        Your invitation is ready! It&apos;s secure and end-to-end encrypted.
                      </p>
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <div className='flex justify-between items-end px-1'>
                      <label className='text-text-tertiary text-[11px] font-medium'>
                        Invite Code
                      </label>
                      {expiresAt ? (
                        <span className='text-text-tertiary text-[10px] font-medium bg-bg-panel-tertiary px-2 py-0.5 rounded-full border border-border-tertiary'>
                          {formatExpiration(expiresAt)}
                        </span>
                      ) : (
                        <span className='text-text-tertiary text-[10px] opacity-50'>
                          No expiration set
                        </span>
                      )}
                    </div>
                    <input
                      type='text'
                      readOnly
                      value={inviteCode}
                      className='w-full px-4 py-3.5 rounded-lg bg-bg-panel-secondary border border-border-tertiary text-text-primary font-mono text-sm shadow-inner outline-none'
                    />
                  </div>

                  <button
                    onClick={handleCopyInvite}
                    className='w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg transition-all font-medium bg-accent-primary text-text-primary hover:bg-accent-primary-hover shadow-sm cursor-pointer'
                  >
                    {copied ? (
                      <>
                        <Check className='w-4 h-4' />
                        Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Link2 className='w-4 h-4' />
                        Copy Invite Link
                      </>
                    )}
                  </button>
                  
                  <div className='bg-bg-panel-tertiary/50 rounded-lg p-4 flex gap-3 border border-border-tertiary'>
                    <Info className='w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5' />
                    <p className='text-[11px] text-text-tertiary leading-relaxed'>
                      Paste this code on your other device to establish a connection. Keep this window open until pairing is confirmed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className='py-4 animate-in fade-in duration-300 space-y-8'>
            <div className='space-y-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between px-1'>
                  <h3 className='text-text-primary font-semibold text-lg'>Connected Devices</h3>
                  <div className='px-2 py-0.5 bg-accent-primary/10 text-accent-primary text-[10px] font-bold rounded uppercase tracking-wider border border-accent-primary/20'>
                    2 Active
                  </div>
                </div>

                <div className='space-y-3'>
                  <div className='p-4 bg-bg-panel-secondary border border-border-tertiary rounded-xl flex items-center gap-4 group transition-all hover:border-border-secondary'>
                    <div className='w-10 h-10 bg-bg-panel-tertiary rounded-full flex items-center justify-center text-text-tertiary group-hover:text-accent-primary transition-colors'>
                      <Monitor className='w-5 h-5' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-text-primary text-sm'>MacBook Pro (This Device)</span>
                        <span className='text-[10px] bg-accent-success/20 text-accent-success px-1.5 py-0.5 rounded'>Online</span>
                      </div>
                      <p className='text-[11px] text-text-tertiary'>Last sync: Just now</p>
                    </div>
                  </div>

                  <div className='p-4 bg-bg-panel-secondary border border-border-tertiary rounded-xl flex items-center gap-4 group transition-all hover:border-border-secondary'>
                    <div className='w-10 h-10 bg-bg-panel-tertiary rounded-full flex items-center justify-center text-text-tertiary group-hover:text-accent-primary transition-colors'>
                      <Smartphone className='w-5 h-5' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-text-primary text-sm'>iPhone 15 Pro</span>
                        <span className='text-[10px] bg-bg-panel-tertiary text-text-tertiary px-1.5 py-0.5 rounded'>Offline</span>
                      </div>
                      <p className='text-[11px] text-text-tertiary'>Last sync: 2 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='mt-8 pt-8 border-t border-border-primary'>
                <div className='flex items-center gap-2 mb-4 text-text-primary'>
                  <Plus className='w-4 h-4' />
                  <h4 className='font-medium text-sm'>Link another device</h4>
                </div>
                
                <div className='flex gap-2 p-1.5 bg-bg-panel-secondary border border-border-tertiary rounded-xl focus-within:border-accent-primary transition-colors shadow-sm'>
                  <input
                    type='text'
                    placeholder='Paste invite code here'
                    value={pasteCode}
                    onChange={(e) => setPasteCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    className='flex-1 bg-transparent px-4 py-2 text-text-primary text-sm outline-none'
                  />
                  <button 
                    onClick={handleConnect}
                    disabled={!pasteCode.trim() || isLoading || step !== 'idle'}
                    className='px-6 py-2 bg-accent-primary text-text-primary rounded-lg hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm'
                  >
                    Join Sync
                  </button>
                </div>
                
                <p className='mt-4 text-[11px] text-text-tertiary leading-relaxed italic'>
                  To sync with another device, create an invite on that device and paste its code here.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='Grow border-t border-border-primary'>
          <div className='bg-bg-panel-tertiary/30 rounded-lg p-4 flex gap-3 text-left border border-border-tertiary/50'>
            <Monitor className='w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5' />
            <div>
              <h5 className='text-text-primary text-sm font-medium mb-1'>End-to-End Encryption</h5>
              <p className='text-text-tertiary text-[11px] leading-relaxed'>
                All data is encrypted before leaving your device. Your notes, attachments, and metadata remain private and can only be decrypted by your verified devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
