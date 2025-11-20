import {
  X,
  ChevronDown,
  Settings as SettingsIcon,
  User,
  RefreshCw,
  Lock,
  Info,
  LogOut,
  Check,
  Link2
} from 'lucide-react'
import { useState } from 'react'

export default function SettingsScreen({ onClose }) {
  const [theme, setTheme] = useState('system')
  const [textSize, setTextSize] = useState(50)
  const [activeSection, setActiveSection] = useState('general')
  const [syncTab, setSyncTab] = useState('invite')
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
      setPasteCode('')
    }
  }

  const sections = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'account', name: 'Account', icon: User },
    { id: 'sync', name: 'Syncing & P2P', icon: RefreshCw },
    { id: 'privacy', name: 'Privacy & Security', icon: Lock },
    { id: 'about', name: 'About', icon: Info }
  ]

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm'>
      <div className='bg-bg-panel border border-border-secondary rounded-xl w-full max-w-5xl mx-4 h-[80vh] flex shadow-xl overflow-hidden'>
        <div className='w-64 bg-bg-panel-secondary border-r border-border-tertiary flex flex-col'>
          <div className='p-4 border-b border-border-tertiary'>
            <h2 className='text-text-primary font-semibold text-lg'>Settings</h2>
          </div>
          <div className='flex-1 overflow-y-auto p-2'>
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                    isActive
                      ? 'bg-accent-primary text-text-primary shadow-sm'
                      : 'text-text-secondary hover:bg-bg-panel-tertiary'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-80'}`}
                  />
                  <span className='text-sm font-medium'>{section.name}</span>
                </button>
              )
            })}
          </div>
          <div className='p-4 border-t border-border-tertiary'>
            <button className='w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium bg-bg-panel-tertiary hover:bg-bg-panel-secondary text-text-secondary hover:text-text-primary border border-border-tertiary hover:border-border-secondary'>
              <LogOut className='w-4 h-4' />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className='flex-1 flex flex-col overflow-hidden bg-bg-panel'>
          <div className='bg-bg-panel-secondary border-b border-border-primary flex items-center justify-between px-6 py-4'>
            <div>
              <h2 className='text-text-primary text-xl font-semibold'>
                {sections.find((s) => s.id === activeSection)?.name || 'Settings'}
              </h2>
              <p className='text-sm mt-1 text-text-tertiary'>
                {activeSection === 'general' &&
                  'Customize the appearance and language of the application.'}
                {activeSection === 'account' && 'Manage your account settings and profile.'}
                {activeSection === 'sync' && 'Configure device syncing and P2P connections.'}
                {activeSection === 'privacy' && 'Control privacy and security settings.'}
                {activeSection === 'about' && 'Application information and version details.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-full bg-bg-panel-secondary hover:bg-bg-panel-tertiary flex items-center justify-center text-text-primary transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto p-6'>
            {activeSection === 'general' && (
              <div className='space-y-8'>
                <div>
                  <h3 className='text-text-primary font-semibold text-lg mb-2'>Appearance</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-text-primary text-sm mb-1'>Theme</label>
                      <p className='text-xs mb-3 text-text-tertiary'>
                        Select your preferred interface theme.
                      </p>
                      <div className='flex gap-2'>
                        {['System', 'Light', 'Dark'].map((option) => (
                          <button
                            key={option}
                            onClick={() => setTheme(option.toLowerCase())}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              theme === option.toLowerCase()
                                ? 'bg-bg-panel-secondary text-text-primary border border-border-secondary'
                                : 'bg-bg-panel-tertiary hover:bg-bg-panel-secondary hover:text-text-primary text-text-secondary border border-transparent'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='text-text-primary font-semibold text-lg mb-2'>Text</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-text-primary text-sm mb-1'>Default Font</label>
                      <p className='text-xs mb-3 text-text-tertiary'>
                        Choose the default font for new notes.
                      </p>
                      <div className='relative'>
                        <select className='w-full px-4 py-2.5 rounded-lg text-sm appearance-none bg-bg-panel-secondary border border-border-primary text-text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none'>
                          <option>System Default</option>
                          <option>SF Pro Text</option>
                          <option>Helvetica</option>
                        </select>
                        <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-text-tertiary' />
                      </div>
                    </div>
                    <div>
                      <label className='block text-text-primary text-sm mb-1'>Text Size</label>
                      <p className='text-xs mb-3 text-text-tertiary'>
                        Adjust the default text size for readability.
                      </p>
                      <div className='px-2'>
                        <div className='flex items-center justify-between mb-2'>
                          <span className='text-xs text-text-tertiary'>Small</span>
                          <span className='text-xs text-text-tertiary'>Large</span>
                        </div>
                        <input
                          type='range'
                          min='0'
                          max='100'
                          value={textSize}
                          onChange={(e) => setTextSize(e.target.value)}
                          className='w-full h-2 bg-bg-panel-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary'
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='text-text-primary font-semibold text-lg mb-2'>Language</h3>
                  <div>
                    <label className='block text-text-primary text-sm mb-1'>Application Language</label>
                    <p className='text-xs mb-3 text-text-tertiary'>
                      This will not affect the content of your notes.
                    </p>
                    <div className='relative'>
                      <select className='w-full px-4 py-2.5 rounded-lg text-sm appearance-none bg-bg-panel-secondary border border-border-primary text-text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none'>
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                      <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none' />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'account' && (
              <div className='space-y-4'>
                <div className='p-4 bg-bg-panel-secondary rounded-lg border border-border-tertiary'>
                  <p className='text-text-primary font-medium mb-1'>Alex Duran</p>
                  <p className='text-sm text-text-tertiary'>alex.duran@p2p.net</p>
                </div>
                <p className='text-sm text-text-tertiary'>Account management features coming soon...</p>
              </div>
            )}

            {activeSection === 'sync' && (
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
                      <div className='w-48 h-48 bg-bg-panel-secondary rounded-lg flex items-center justify-center border border-border-tertiary'>
                        <div className='text-xs text-center text-text-tertiary'>
                          QR Code
                          <br />
                          Placeholder
                        </div>
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

                        <button
                          onClick={handleCopyInvite}
                          className='w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium bg-accent-primary text-text-primary hover:bg-accent-primary-hover'
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
            )}

            {activeSection === 'privacy' && (
              <div className='space-y-4'>
                <p className='text-sm text-text-tertiary'>
                  Privacy and security settings coming soon...
                </p>
              </div>
            )}

            {activeSection === 'about' && (
              <div className='space-y-4'>
                <div className='p-4 bg-bg-panel-secondary rounded-lg border border-border-tertiary'>
                  <p className='text-text-primary font-medium mb-2'>Pear Notes</p>
                  <p className='text-sm text-text-tertiary'>Version 1.0.0</p>
                </div>
              </div>
            )}
          </div>

          <div className='bg-bg-panel-secondary border-t border-border-primary px-6 py-4 flex items-center justify-end gap-3'>
            <button
              onClick={onClose}
              className='px-6 py-2.5 rounded-lg transition-all text-sm font-medium bg-bg-panel-tertiary hover:bg-bg-panel-secondary text-text-secondary hover:text-text-primary border border-border-tertiary hover:border-border-secondary'
            >
              Cancel
            </button>
            <button className='px-6 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md bg-accent-primary text-text-primary hover:bg-accent-primary-hover'>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
