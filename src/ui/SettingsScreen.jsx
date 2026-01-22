import {
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
    { id: 'sync', name: 'Linking & P2P', icon: RefreshCw }
  ]

  return (
    <div className='fixed inset-0 flex items-center justify-center z-[110] p-6'>
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-700 cursor-pointer"
        onClick={onClose}
      />

      <div className='relative bg-bg-panel/80 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] w-full max-w-5xl h-[80vh] flex shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500'>
        <div className="absolute -top-48 -left-48 w-96 h-96 bg-accent-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className='w-72 bg-white/[0.02] border-r border-white/[0.05] flex flex-col relative z-10'>
          <div className='p-8'>
            <h2 className='text-text-primary font-black text-2xl tracking-tighter'>Settings</h2>
            <p className='text-text-tertiary text-[11px] font-bold uppercase tracking-[0.2em] mt-1 opacity-50'>Preference Hub</p>
          </div>
          
          <div className='flex-1 overflow-y-auto px-4 space-y-2'>
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 relative group
                    ${
                      isActive
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-110 opacity-100' : 'group-hover:scale-105 opacity-60 group-hover:opacity-100'}`}
                  />
                  <span className={`text-[15px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{section.name}</span>
                </button>
              )
            })}
          </div>

          <div className="p-6">
            <button
              onClick={onClose}
              className='w-full py-4 bg-bg-tertiary/40 border border-white/[0.05] text-text-secondary rounded-2xl hover:bg-bg-tertiary transition-all font-bold text-sm active:scale-95'
            >
              Close Window
            </button>
          </div>
        </div>

        <div className='flex-1 flex flex-col overflow-hidden bg-transparent relative z-10'>
          <div className='px-10 py-10 flex items-center justify-between'>
            <div>
              <h2 className='text-text-primary text-3xl font-black tracking-tighter'>
                {sections.find((s) => s.id === activeSection)?.name || 'Settings'}
              </h2>
              <p className='text-[13px] mt-2 text-text-tertiary font-medium opacity-70 max-w-md leading-relaxed'>
                {activeSection === 'general' &&
                  'Customize your personal workspace experience, from aesthetics to native language supports.'}
                {activeSection === 'sync' && 'Manage your secure peer-to-peer network and linked devices with end-to-end encryption.'}
              </p>
            </div>
          </div>

          <div className='flex-1 overflow-y-auto px-10 pb-10 scrollbar-hide'>
            {activeSection === 'general' && <GeneralSettings />}
            {activeSection === 'sync' && <SyncSettings onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  )
}
