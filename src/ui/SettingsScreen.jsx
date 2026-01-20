import {
  X,
  Settings as SettingsIcon,
  RefreshCw
} from 'lucide-react'
import { useState } from 'react'
import GeneralSettings from './GeneralSettings'
import SyncSettings from './SyncSettings'

export default function SettingsScreen({ onClose }) {
  const [activeSection, setActiveSection] = useState('general')

  const sections = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'sync', name: 'Syncing & P2P', icon: RefreshCw }
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
                {activeSection === 'sync' && 'Configure device syncing and P2P connections.'}
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
            {activeSection === 'general' && <GeneralSettings />}
            {activeSection === 'sync' && <SyncSettings onClose={onClose} />}
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
