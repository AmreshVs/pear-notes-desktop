import { X, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function SettingsScreen({ onClose }) {
  const [theme, setTheme] = useState('system')
  const [textSize, setTextSize] = useState(50)
  const [activeSection, setActiveSection] = useState('general')

  const sections = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'account', name: 'Account', icon: '👤' },
    { id: 'sync', name: 'Syncing & P2P', icon: '🔄' },
    { id: 'privacy', name: 'Privacy & Security', icon: '🔒' },
    { id: 'about', name: 'About', icon: 'ℹ️' }
  ]

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-[#1C1C1E] rounded-lg w-full max-w-5xl mx-4 h-[80vh] flex border border-[#2C2C2E]'>
        {/* Left Sidebar */}
        <div className='w-64 bg-[#2C2C2E] border-r border-[#3A3A3C] flex flex-col'>
          <div className='p-4 border-b border-[#3A3A3C]'>
            <h2 className='text-white font-semibold text-lg'>Settings</h2>
          </div>
          <div className='flex-1 overflow-y-auto p-2'>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  activeSection === section.id
                    ? 'bg-[#007AFF] text-white'
                    : 'text-[#E0E0E0] hover:bg-[#3A3A3C]'
                }`}
              >
                <span className='text-lg'>{section.icon}</span>
                <span className='text-sm font-medium'>{section.name}</span>
              </button>
            ))}
          </div>
          <div className='p-4 border-t border-[#3A3A3C]'>
            <button className='w-full px-4 py-2.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#E0E0E0] rounded-lg transition-colors text-sm font-medium'>
              Logout
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          <div className='flex items-center justify-between px-6 py-4 border-b border-[#2C2C2E]'>
            <div>
              <h2 className='text-white text-xl font-semibold'>
                {sections.find((s) => s.id === activeSection)?.name || 'Settings'}
              </h2>
              <p className='text-[#8E8E93] text-sm mt-1'>
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
              className='w-8 h-8 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] flex items-center justify-center text-white transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto p-6'>
            {activeSection === 'general' && (
              <div className='space-y-8'>
                {/* Appearance */}
                <div>
                  <h3 className='text-white font-semibold text-lg mb-2'>Appearance</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-white text-sm mb-1'>Theme</label>
                      <p className='text-[#8E8E93] text-xs mb-3'>
                        Select your preferred interface theme.
                      </p>
                      <div className='flex gap-2'>
                        {['System', 'Light', 'Dark'].map((option) => (
                          <button
                            key={option}
                            onClick={() => setTheme(option.toLowerCase())}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              theme === option.toLowerCase()
                                ? 'bg-[#2C2C2E] text-white'
                                : 'bg-[#3A3A3C] text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white'
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
                  <h3 className='text-white font-semibold text-lg mb-2'>Text</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-white text-sm mb-1'>Default Font</label>
                      <p className='text-[#8E8E93] text-xs mb-3'>
                        Choose the default font for new notes.
                      </p>
                      <div className='relative'>
                        <select className='w-full px-4 py-2.5 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none'>
                          <option>System Default</option>
                          <option>SF Pro Text</option>
                          <option>Helvetica</option>
                        </select>
                        <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8E8E93] pointer-events-none' />
                      </div>
                    </div>
                    <div>
                      <label className='block text-white text-sm mb-1'>Text Size</label>
                      <p className='text-[#8E8E93] text-xs mb-3'>
                        Adjust the default text size for readability.
                      </p>
                      <div className='px-2'>
                        <div className='flex items-center justify-between mb-2'>
                          <span className='text-[#8E8E93] text-xs'>Small</span>
                          <span className='text-[#8E8E93] text-xs'>Large</span>
                        </div>
                        <input
                          type='range'
                          min='0'
                          max='100'
                          value={textSize}
                          onChange={(e) => setTextSize(e.target.value)}
                          className='w-full h-2 bg-[#3A3A3C] rounded-lg appearance-none cursor-pointer'
                          style={{
                            background: `linear-gradient(to right, #007AFF 0%, #007AFF ${textSize}%, #3A3A3C ${textSize}%, #3A3A3C 100%)`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <h3 className='text-white font-semibold text-lg mb-2'>Language</h3>
                  <div>
                    <label className='block text-white text-sm mb-1'>Application Language</label>
                    <p className='text-[#8E8E93] text-xs mb-3'>
                      This will not affect the content of your notes.
                    </p>
                    <div className='relative'>
                      <select className='w-full px-4 py-2.5 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none'>
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                      <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8E8E93] pointer-events-none' />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'account' && (
              <div className='space-y-4'>
                <div className='p-4 bg-[#2C2C2E] rounded-lg border border-[#3A3A3C]'>
                  <p className='text-white font-medium mb-1'>Alex Duran</p>
                  <p className='text-[#8E8E93] text-sm'>alex.duran@p2p.net</p>
                </div>
                <p className='text-[#8E8E93] text-sm'>Account management features coming soon...</p>
              </div>
            )}

            {activeSection === 'sync' && (
              <div className='space-y-4'>
                <p className='text-[#8E8E93] text-sm'>P2P syncing configuration coming soon...</p>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className='space-y-4'>
                <p className='text-[#8E8E93] text-sm'>
                  Privacy and security settings coming soon...
                </p>
              </div>
            )}

            {activeSection === 'about' && (
              <div className='space-y-4'>
                <div className='p-4 bg-[#2C2C2E] rounded-lg border border-[#3A3A3C]'>
                  <p className='text-white font-medium mb-2'>Pear Notes</p>
                  <p className='text-[#8E8E93] text-sm'>Version 1.0.0</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='px-6 py-4 border-t border-[#2C2C2E] flex items-center justify-end gap-3'>
            <button
              onClick={onClose}
              className='px-6 py-2.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#E0E0E0] rounded-lg transition-colors text-sm font-medium'
            >
              Cancel
            </button>
            <button className='px-6 py-2.5 bg-[#007AFF] hover:bg-[#0051D5] text-white rounded-lg transition-colors text-sm font-medium'>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
