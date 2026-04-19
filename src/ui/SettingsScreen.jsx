import {
  Settings as SettingsIcon,
  RefreshCw,
  HardDrive,
  Database,
  X
} from 'lucide-react'
import { useState } from 'react'
import GeneralSettings from './GeneralSettings'
import SyncSettings from './SyncSettings'
import BackupSettings from './BackupSettings'
import StorageSettings from './StorageSettings'

export default function SettingsScreen({ onClose }) {
  const [activeSection, setActiveSection] = useState('general')
  const [isExiting, setIsExiting] = useState(false)

  const handleAnimatedClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 300)
  }

  const sections = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'sync', name: 'Link & Sync', icon: RefreshCw },
    { id: 'backup', name: 'Backup & Restore', icon: HardDrive },
    { id: 'storage', name: 'Storage', icon: Database }
  ]

  return (
    <div className='fixed inset-0 flex items-center justify-center z-[110] p-6'>
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-xl animate-in ${isExiting ? 'animate-out fade-out' : 'fade-in'} duration-300 cursor-pointer`}
        onClick={handleAnimatedClose}
      />

      <div className={`relative bg-bg-panel/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] w-full max-w-5xl h-[80vh] flex shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in ${isExiting ? 'animate-out zoom-out-95 slide-out-to-bottom-8' : 'zoom-in-95 slide-in-from-bottom-8'} duration-300 ease-out`}>
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
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-colors duration-0 relative group
                    ${
                      isActive
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-0 ${isActive ? 'scale-110 opacity-100' : 'group-hover:scale-105 opacity-60 group-hover:opacity-100'}`}
                  />
                  <span className={`text-[15px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{section.name}</span>
                </button>
              )
            })}
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
                {activeSection === 'backup' && 'Create encrypted backups of your notes and media, or restore from a previous backup file.'}
                {activeSection === 'storage' && 'Monitor your notes data size, on-disk footprint, and reclaim storage by clearing unreachable media.'}
              </p>
            </div>
            <button
              onClick={handleAnimatedClose}
              className='p-3 bg-white/[0.03] hover:bg-white/[0.08] text-text-tertiary hover:text-text-primary rounded-xl transition-all active:scale-90 border border-white/[0.05] align-self-start'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto px-10 pb-10 scrollbar-hide'>
            {activeSection === 'general' && <GeneralSettings />}
            {activeSection === 'sync' && <SyncSettings onClose={handleAnimatedClose} />}
            {activeSection === 'backup' && <BackupSettings />}
            {activeSection === 'storage' && <StorageSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
