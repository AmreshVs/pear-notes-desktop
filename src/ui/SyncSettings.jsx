import { Check, Link2, Loader2, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createInvite, getInvite, getInviteExpiresAt, getSyncIsLoading, getPairingStatus, subscribePairing } from '../store/slices/syncSlice'

export default function SyncSettings() {
  const dispatch = useDispatch()
  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const { pairing, confirmed, done } = useSelector(getPairingStatus)
  const isInviteGenerated = !!inviteCode

  useEffect(() => {
    if (isInviteGenerated && !done) {
      dispatch(subscribePairing())
    }
  }, [isInviteGenerated, done, dispatch])
  
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
      alert('Connecting to device...')
      setPasteCode('')
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
    <div className='space-y-6'>
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
        <div className='max-w-xl mx-auto py-4'>
          <h3 className='text-text-primary font-semibold text-lg mb-2'>
            Share this invite with another device
          </h3>
          <p className='text-sm mb-8 text-text-tertiary'>
            Generate an invite link to connect another device running the app. 
            All your notes will be synced securely with end-to-end encryption.
          </p>

          <div className='space-y-6'>
            {!isInviteGenerated || (done && !pairing && !confirmed) ? (
              <div className='bg-bg-panel-secondary border border-border-tertiary rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4'>
                <div className='w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center'>
                  <Link2 className='w-8 h-8 text-accent-primary' />
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
              </div>
            ) : (
              <div className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                {done ? (
                  <div className='bg-accent-success/10 border border-accent-success/20 rounded-lg p-6 flex flex-col items-center text-center animate-in zoom-in duration-300'>
                    <div className='w-12 h-12 bg-accent-success/20 rounded-full flex items-center justify-center mb-4'>
                      <Check className='w-6 h-6 text-accent-success' />
                    </div>
                    <h4 className='text-accent-success font-semibold text-lg mb-1'>Pairing Complete!</h4>
                    <p className='text-accent-success/80 text-sm'>
                      Your devices are now connected and syncing notes.
                    </p>
                  </div>
                ) : confirmed ? (
                  <div className='bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-6 flex flex-col items-center text-center animate-pulse'>
                    <Loader2 className='w-8 h-8 text-accent-primary animate-spin mb-4' />
                    <h4 className='text-accent-primary font-semibold text-lg mb-1'>Pairing Confirmed!</h4>
                    <p className='text-accent-primary/80 text-sm'>
                      Setting up secure connection... This will only take a moment.
                    </p>
                  </div>
                ) : pairing ? (
                  <div className='bg-bg-panel-secondary border border-border-tertiary rounded-lg p-6 flex items-center gap-4 animate-in slide-in-from-top-2'>
                    <Loader2 className='w-5 h-5 text-accent-primary animate-spin' />
                    <div className='text-left'>
                      <h4 className='text-text-primary font-medium text-sm'>Device attempting to connect...</h4>
                      <p className='text-text-tertiary text-xs'>Please wait while the connection is established.</p>
                    </div>
                  </div>
                ) : (
                  <div className='bg-accent-success/10 border border-accent-success/20 rounded-lg p-4'>
                    <div className='flex items-start gap-3'>
                      <Check className='w-5 h-5 text-accent-success flex-shrink-0 mt-0.5' />
                      <p className='text-accent-success text-sm'>
                        Your invitation is ready! It&apos;s secure and end-to-end encrypted.
                      </p>
                    </div>
                  </div>
                )}

                {!done && !confirmed && !pairing && (
                  <>
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
                    
                    <div className='bg-bg-panel-tertiary rounded-lg p-4 flex gap-3 border border-border-tertiary'>
                      <Info className='w-4 h-4 text-text-tertiary flex-shrink-0 mt-0.5' />
                      <p className='text-[11px] text-text-tertiary leading-relaxed'>
                        Paste this code on your other device to establish a connection. Keep this window open until pairing is confirmed.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className='mt-8 pt-8 border-t border-border-primary'>
            <h3 className='text-text-primary font-semibold text-lg mb-2'>Have an invite?</h3>
            <p className='text-sm mb-4 text-text-tertiary'>
              Paste an invite link or code from another device to establish a sync
              connection.
            </p>
            <div className='flex gap-2'>
              <input
                type='text'
                value={pasteCode}
                onChange={(e) => setPasteCode(e.target.value)}
                placeholder='Paste invite link or code here'
                className='flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-tertiary text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary'
              />
              <button
                onClick={handleConnect}
                disabled={!pasteCode.trim()}
                className='px-6 py-2.5 rounded-lg transition-colors font-medium bg-accent-primary text-text-primary hover:bg-accent-primary-hover disabled:bg-bg-panel-tertiary disabled:text-text-tertiary'
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h3 className='text-text-primary font-semibold text-lg mb-4'>Connected Devices</h3>
          <div className='space-y-3'>
            <div className='p-4 bg-bg-panel-secondary rounded-lg border border-border-tertiary'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-text-primary font-medium'>This Device</p>
                  <p className='text-sm text-text-tertiary'>
                    MacBook Pro • Last synced: Just now
                  </p>
                </div>
                <span className='px-3 py-1 bg-accent-success/10 text-accent-success text-xs rounded-full border border-accent-success/20'>
                  Active
                </span>
              </div>
            </div>
            <p className='text-sm text-center py-4 text-text-tertiary'>
              No other devices connected
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
