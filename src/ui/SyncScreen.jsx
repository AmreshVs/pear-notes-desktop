import { X, Copy, Check, Link2 } from 'lucide-react'
import { useState } from 'react'

export default function SyncScreen({ onClose }) {
  const [activeTab, setActiveTab] = useState('invite')
  const [inviteCode, setInviteCode] = useState('abc123xyz789')
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
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-[#1C1C1E] rounded-lg w-full max-w-2xl mx-4 border border-[#2C2C2E]'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-[#2C2C2E]'>
          <h2 className='text-white text-xl font-semibold'>Sync Devices</h2>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] flex items-center justify-center text-white transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-[#2C2C2E] px-6'>
          <button
            onClick={() => setActiveTab('invite')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'invite'
                ? 'text-white border-[#007AFF]'
                : 'text-[#8E8E93]] border-transparent hover:text-white'
            }`}
          >
            Invite a New Device
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'text-white border-[#007AFF]'
                : 'text-[#8E8E93] border-transparent hover:text-white'
            }`}
          >
            Manage Connected Devices
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {activeTab === 'invite' ? (
            <div>
              <h3 className='text-white font-semibold text-lg mb-2'>Share this invite with another device</h3>
              <p className='text-[#8E8E93] text-sm mb-6'>
                Scan this QR code with another device running the app or copy the link to connect. Your notes are
                end-to-end encrypted during sync.
              </p>

              <div className='flex gap-6'>
                {/* QR Code Placeholder */}
                <div className='w-48 h-48 bg-[#2C2C2E] rounded-lg flex items-center justify-center'>
                  <div className='text-[#8E8E93] text-xs text-center'>
                    QR Code
                    <br />
                    Placeholder
                  </div>
                </div>

                <div className='flex-1'>
                  {/* Security Message */}
                  <div className='bg-[#34C759]/20 border border-[#34C759]/30 rounded-lg p-4 mb-4'>
                    <div className='flex items-start gap-3'>
                      <Check className='w-5 h-5 text-[#34C759] flex-shrink-0 mt-0.5' />
                      <p className='text-[#34C759] text-sm'>
                        Your connection is secure and end-to-end encrypted.
                      </p>
                    </div>
                  </div>

                  {/* Copy Invite Link */}
                  <button
                    onClick={handleCopyInvite}
                    className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#007AFF] hover:bg-[#0051D5] text-white rounded-lg transition-colors font-medium'
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
              <div className='mt-8 pt-8 border-t border-[#2C2C2E]'>
                <h3 className='text-white font-semibold text-lg mb-2'>Have an invite?</h3>
                <p className='text-[#8E8E93] text-sm mb-4'>
                  Paste an invite link or code from another device to establish a sync connection.
                </p>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    value={pasteCode}
                    onChange={(e) => setPasteCode(e.target.value)}
                    placeholder='Paste invite link or code here'
                    className='flex-1 px-4 py-2.5 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white placeholder-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent'
                  />
                  <button
                    onClick={handleConnect}
                    disabled={!pasteCode.trim()}
                    className='px-6 py-2.5 bg-[#007AFF] hover:bg-[#0051D5] disabled:bg-[#3A3A3C] disabled:text-[#8E8E93] text-white rounded-lg transition-colors font-medium'
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className='text-white font-semibold text-lg mb-4'>Connected Devices</h3>
              <div className='space-y-3'>
                <div className='p-4 bg-[#2C2C2E] rounded-lg border border-[#3A3A3C]'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-white font-medium'>This Device</p>
                      <p className='text-[#8E8E93] text-sm'>MacBook Pro • Last synced: Just now</p>
                    </div>
                    <span className='px-3 py-1 bg-[#34C759]/20 text-[#34C759] text-xs rounded-full'>Active</span>
                  </div>
                </div>
                <p className='text-[#8E8E93] text-sm text-center py-4'>No other devices connected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

