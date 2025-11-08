import {
  X,
  ChevronDown,
  Settings as SettingsIcon,
  User,
  RefreshCw,
  Lock,
  Info,
  LogOut
} from 'lucide-react'
import { useState } from 'react'

export default function SettingsScreen({ onClose }) {
  const [theme, setTheme] = useState('system')
  const [textSize, setTextSize] = useState(50)
  const [activeSection, setActiveSection] = useState('general')

  const sections = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'account', name: 'Account', icon: User },
    { id: 'sync', name: 'Syncing & P2P', icon: RefreshCw },
    { id: 'privacy', name: 'Privacy & Security', icon: Lock },
    { id: 'about', name: 'About', icon: Info }
  ]

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='modal-bg rounded-lg w-full max-w-5xl mx-4 h-[80vh] flex'>
        {/* Left Sidebar */}
        <div className='w-64 bg-panel-secondary border-r border-tertiary flex flex-col'>
          <div className='p-4 border-b border-tertiary'>
            <h2 className='text-primary font-semibold text-lg'>Settings</h2>
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
                      ? 'bg-accent-primary text-primary shadow-sm'
                      : 'text-secondary hover:bg-panel-tertiary'
                  }`}
                >
                  <Icon
                    className='w-4 h-4 flex-shrink-0'
                    style={{
                      opacity: isActive ? 1 : 0.8
                    }}
                  />
                  <span className='text-sm font-medium'>{section.name}</span>
                </button>
              )
            })}
          </div>
          <div className='p-4 border-t border-tertiary'>
            <button className='w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium bg-panel-tertiary hover:bg-panel-secondary text-secondary hover:text-primary border border-tertiary hover:border-secondary'>
              <LogOut className='w-4 h-4' />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          <div className='modal-header-bg flex items-center justify-between px-6 py-4'>
            <div>
              <h2 className='text-primary text-xl font-semibold'>
                {sections.find((s) => s.id === activeSection)?.name || 'Settings'}
              </h2>
              <p className='text-sm mt-1 text-tertiary'>
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
              className='w-8 h-8 rounded-full bg-panel-secondary hover:bg-panel-tertiary flex items-center justify-center text-primary transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto p-6'>
            {activeSection === 'general' && (
              <div className='space-y-8'>
                {/* Appearance */}
                <div>
                  <h3 className='text-primary font-semibold text-lg mb-2'>Appearance</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-primary text-sm mb-1'>Theme</label>
                      <p className='text-xs mb-3 text-tertiary'>
                        Select your preferred interface theme.
                      </p>
                      <div className='flex gap-2'>
                        {['System', 'Light', 'Dark'].map((option) => (
                          <button
                            key={option}
                            onClick={() => setTheme(option.toLowerCase())}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              theme === option.toLowerCase()
                                ? 'bg-panel-secondary text-primary'
                                : 'bg-panel-tertiary hover:bg-panel-secondary hover:text-primary'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div>
                  <h3 className='text-primary font-semibold text-lg mb-2'>Text</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-primary text-sm mb-1'>Default Font</label>
                      <p className='text-xs mb-3 text-tertiary'>
                        Choose the default font for new notes.
                      </p>
                      <div className='relative'>
                        <select className='input-field w-full px-4 py-2.5 rounded-lg text-sm appearance-none'>
                          <option>System Default</option>
                          <option>SF Pro Text</option>
                          <option>Helvetica</option>
                        </select>
                        <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-tertiary' />
                      </div>
                    </div>
                    <div>
                      <label className='block text-primary text-sm mb-1'>Text Size</label>
                      <p className='text-xs mb-3 text-tertiary'>
                        Adjust the default text size for readability.
                      </p>
                      <div className='px-2'>
                        <div className='flex items-center justify-between mb-2'>
                          <span className='text-xs text-tertiary'>Small</span>
                          <span className='text-xs text-tertiary'>Large</span>
                        </div>
                        <input
                          type='range'
                          min='0'
                          max='100'
                          value={textSize}
                          onChange={(e) => setTextSize(e.target.value)}
                          className='w-full h-2 bg-panel-tertiary rounded-lg appearance-none cursor-pointer'
                          style={{
                            background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${textSize}%, var(--bg-panel-tertiary) ${textSize}%, var(--bg-panel-tertiary) 100%)`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <h3 className='text-primary font-semibold text-lg mb-2'>Language</h3>
                  <div>
                    <label className='block text-primary text-sm mb-1'>Application Language</label>
                    <p className='text-xs mb-3 text-tertiary'>
                      This will not affect the content of your notes.
                    </p>
                    <div className='relative'>
                      <select className='input-field w-full px-4 py-2.5 rounded-lg text-sm appearance-none'>
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                      <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none' />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'account' && (
              <div className='space-y-4'>
                <div className='p-4 bg-panel-secondary rounded-lg border border-tertiary'>
                  <p className='text-primary font-medium mb-1'>Alex Duran</p>
                  <p className='text-sm text-tertiary'>alex.duran@p2p.net</p>
                </div>
                <p className='text-sm text-tertiary'>Account management features coming soon...</p>
              </div>
            )}

            {activeSection === 'sync' && (
              <div className='space-y-4'>
                <p className='text-sm text-tertiary'>P2P syncing configuration coming soon...</p>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className='space-y-4'>
                <p className='text-sm text-tertiary'>
                  Privacy and security settings coming soon...
                </p>
              </div>
            )}

            {activeSection === 'about' && (
              <div className='space-y-4'>
                <div className='p-4 bg-panel-secondary rounded-lg border border-tertiary'>
                  <p className='text-primary font-medium mb-2'>Pear Notes</p>
                  <p className='text-sm text-tertiary'>Version 1.0.0</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='modal-header-bg px-6 py-4 flex items-center justify-end gap-3'>
            <button
              onClick={onClose}
              className='px-6 py-2.5 rounded-lg transition-all text-sm font-medium bg-panel-tertiary hover:bg-panel-secondary text-secondary hover:text-primary border border-tertiary hover:border-secondary'
            >
              Cancel
            </button>
            <button className='btn-primary px-6 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md'>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
