import { Check, Link2 } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createInvite, getInvite, getInviteExpiresAt, getSyncIsLoading } from '../store/slices/syncSlice'

export default function SyncSettings() {
  const dispatch = useDispatch()
  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
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
      alert('Connecting to device...')
      setPasteCode('')
    }
  }

  const formatExpiration = (timestamp) => {
    if (!timestamp) return ''
    // Handle both seconds and milliseconds (Unix timestamp)
    const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
    const date = new Date(ms)
    
    // Check if date is valid
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
        <div>
          <h3 className='text-text-primary font-semibold text-lg mb-2'>
            Share this invite with another device
          </h3>
          <p className='text-sm mb-6 text-text-tertiary'>
            Scan this QR code with another device running the app or copy the link to
            connect. Your notes are end-to-end encrypted during sync.
          </p>

          <div className='flex gap-6'>
            <div className='w-48 h-48 bg-bg-panel-secondary rounded-lg flex items-center justify-center border border-border-tertiary p-4'>
              {!isInviteGenerated ? (
                <button
                  onClick={handleCreateInvite}
                  disabled={isLoading}
                  className='w-full h-full flex items-center justify-center text-xs font-medium bg-bg-panel-tertiary hover:bg-bg-panel-secondary text-text-primary rounded-md border border-border-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoading ? 'Generating...' : 'Create Invite'}
                </button>
              ) : (
                <div className='text-xs text-center text-text-tertiary'>
                  QR Code
                  <br />
                  Placeholder
                </div>
              )}
            </div>

            <div className='flex-1'>
              <div className='bg-accent-success/10 border border-accent-success/20 rounded-lg p-4 mb-4'>
                <div className='flex items-start gap-3'>
                  <Check className='w-5 h-5 text-accent-success flex-shrink-0 mt-0.5' />
                  <p className='text-accent-success text-sm'>
                    Your connection is secure and end-to-end encrypted.
                  </p>
                </div>
              </div>

              {isInviteGenerated && (
                <div className='mb-4 space-y-1.5'>
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
                    className='w-full px-4 py-3 rounded-lg bg-bg-panel-tertiary border border-border-tertiary text-text-primary font-mono text-sm shadow-inner outline-none'
                  />
                </div>
              )}

              <button
                onClick={handleCopyInvite}
                disabled={!isInviteGenerated}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isInviteGenerated
                    ? 'bg-accent-primary text-text-primary hover:bg-accent-primary-hover shadow-sm cursor-pointer'
                    : 'bg-bg-panel-tertiary text-text-tertiary border border-border-tertiary cursor-not-allowed opacity-50'
                }`}
              >
                {copied ? (
                  <>
                    <Check className='w-4 h-4' />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link2 className='w-4 h-4' />
                    Copy Invite Link
                  </>
                )}
              </button>
            </div>
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
