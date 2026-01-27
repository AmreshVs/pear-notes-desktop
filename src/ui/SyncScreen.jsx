import { X, Check, Link2 } from 'lucide-react'
import { useState } from 'react'

export default function SyncScreen({ onClose }) {
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
      // Mock connection logic
      alert('Connecting to device...')
      onClose()
    }
  }

  return (
    <div className='fixed inset-0 flex items-center justify-center z-50 p-6'>
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-1000 cursor-pointer"
        onClick={onClose}
      />
      <div className='relative bg-bg-panel border border-border-secondary rounded-xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 ease-out'>
        {/* Header */}
        <div className='bg-bg-panel-secondary border-b border-border-primary flex items-center justify-between px-6 py-4'>
          <h2 className='text-text-primary text-xl font-semibold'>Sync Devices</h2>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-bg-panel-secondary hover:bg-bg-panel-tertiary flex items-center justify-center text-text-primary transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-border-primary px-6 bg-bg-panel'>
          <button
            onClick={() => setActiveTab('invite')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'invite'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            Invite a New Device
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            Manage Connected Devices
          </button>
        </div>

        {/* Content */}
        <div className='p-6 bg-bg-panel'>
          {activeTab === 'invite' ? (
            <div>
              <h3 className='text-text-primary font-semibold text-lg mb-2'>
                Share this invite with another device
              </h3>
              <p className='text-sm mb-6 text-text-tertiary'>
                Scan this QR code with another device running the app or copy the link to connect.
                Your notes are end-to-end encrypted during sync.
              </p>

              <div className='flex gap-6'>
                {/* QR Code Placeholder */}
                <div className='w-48 h-48 bg-bg-panel-secondary rounded-lg flex items-center justify-center border border-border-tertiary'>
                  <div className='text-xs text-center text-text-tertiary'>
                    QR Code
                    <br />
                    Placeholder
                  </div>
                </div>

                <div className='flex-1'>
                  {/* Security Message */}
                  <div className='bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4'>
                    <div className='flex items-start gap-3'>
                      <Check className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
                      <p className='text-green-600 dark:text-green-400 text-sm'>
                        Your connection is secure and end-to-end encrypted.
                      </p>
                    </div>
                  </div>

                  {/* Copy Invite Link */}
                  <button
                    onClick={handleCopyInvite}
                    className='w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium bg-accent-primary text-text-primary hover:bg-accent-primary-hover shadow-sm'
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

              {/* Have an invite section */}
              <div className='mt-8 pt-8 border-t border-border-primary'>
                <h3 className='text-text-primary font-semibold text-lg mb-2'>Have an invite?</h3>
                <p className='text-sm mb-4 text-text-tertiary'>
                  Paste an invite link or code from another device to establish a sync connection.
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
                    className='px-6 py-2.5 rounded-lg transition-colors font-medium bg-accent-primary text-text-primary hover:bg-accent-primary-hover disabled:bg-bg-panel-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed'
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
                      <p className='text-sm text-text-tertiary'>MacBook Pro • Last synced: Just now</p>
                    </div>
                    <span className='px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-full border border-green-500/20'>
                      Active
                    </span>
                  </div>
                </div>
                <p className='text-sm text-center py-4 text-text-tertiary'>No other devices connected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
