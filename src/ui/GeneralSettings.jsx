import { ChevronDown, LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  getTheme,
  getFontFamily,
  setTheme,
  updateSetting,
  getEditorFontSize,
  getSortBy
} from '@pear-notes/core/store/slices/settingsSlice.js'
import { isDeviceAuthSupported } from '../lib/deviceAuth'

const AUTH_METHOD_LABELS = {
  mac: 'Touch ID or your macOS password',
  win: 'Windows Hello or your Windows PIN',
  linux: 'your system authentication'
}

function getAuthMethodLabel () {
  const platform = (typeof navigator !== 'undefined' ? navigator.platform : '').toLowerCase()
  if (platform.includes('mac')) return AUTH_METHOD_LABELS.mac
  if (platform.includes('win')) return AUTH_METHOD_LABELS.win
  return AUTH_METHOD_LABELS.linux
}

export default function GeneralSettings() {
  const dispatch = useDispatch()
  const theme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const [lockAvailable, setLockAvailable] = useState(false)

  useEffect(() => {
    let active = true
    isDeviceAuthSupported().then((supported) => {
      if (active) setLockAvailable(supported)
    })
    return () => {
      active = false
    }
  }, [])

  const handleUpdateSetting = (key, value) => {
    dispatch(updateSetting({ key, value }))
  }

  return (
    <div className='space-y-12 max-w-2xl mx-auto'>
      <div className="space-y-1">
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Interface</h3>
        
        <div className="bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md hardware-accelerated">
          <div className="p-6 flex items-center justify-between border-b border-border-primary group hover:bg-overlay-faint transition-colors">
            <div className="space-y-1">
              <label className='block text-text-primary text-[15px] font-bold'>App Theme</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Select your preferred aesthetic.</p>
            </div>
            <div className='flex bg-bg-tertiary/50 p-1 rounded-xl border border-border-primary'>
              {['System', 'Light', 'Dark'].map((option) => (
                <button
                  key={option}
                  onClick={() => dispatch(setTheme(option.toLowerCase()))}
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all duration-300 ${
                    theme === option.toLowerCase()
                      ? 'bg-accent-primary text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-overlay-soft'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Notes List</h3>
        <div className="bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md hardware-accelerated">
          <div className="p-6 flex items-center justify-between group hover:bg-overlay-faint transition-colors">
            <div className="space-y-1">
              <label className='block text-text-primary text-[15px] font-bold'>Sort notes by</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Choose your preferred sorting order.</p>
            </div>
            <div className='relative group/select'>
              <select 
                value={sortBy}
                onChange={(e) => handleUpdateSetting('sortBy', e.target.value)}
                className='appearance-none bg-bg-tertiary/50 border border-border-primary text-text-primary text-[13px] font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary'
              >
                <option value="updatedAt">Date Edited</option>
                <option value="createdAt">Date Created</option>
                <option value="title">Title</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Editor</h3>
        <div className="bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md hardware-accelerated">
          <div className="p-6 flex items-center justify-between border-b border-border-primary group hover:bg-overlay-faint transition-colors">
            <div className="space-y-1">
              <label className='block text-text-primary text-[15px] font-bold'>Font Family</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Primary typeface for notes.</p>
            </div>
            <div className='relative group/select'>
              <select 
                value={fontFamily}
                onChange={(e) => handleUpdateSetting('fontFamily', e.target.value)}
                className='appearance-none bg-bg-tertiary/50 border border-border-primary text-text-primary text-[13px] font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary'
              >
                <option value="Inter">Inter</option>
                <option value="Outfit">Outfit</option>
                <option value="Lora">Lora</option>
                <option value="Newsreader">Newsreader</option>
                <option value="IBM Plex Mono">IBM Plex Mono</option>
                <option value="System">System Default</option>
                <option value="Serif">Serif</option>
                <option value="Mono">Monospace</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>

          <div className="p-6 space-y-4 group hover:bg-overlay-faint transition-colors">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className='block text-text-primary text-[15px] font-bold'>Default text size</label>
                <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Adjust the editor&apos;s base font size.</p>
              </div>
              <span className="text-[14px] font-bold text-accent-primary bg-accent-primary/10 px-3 py-1 rounded-lg">
                {editorFontSize}px
              </span>
            </div>
            
            <div className="px-2 pt-4 pb-2">
              <div className="flex items-end justify-between mb-3 px-1">
                <span className="text-[12px] font-bold text-text-tertiary leading-none">A</span>
                <span className="text-[20px] font-bold text-text-tertiary leading-none">A</span>
              </div>
              <div className="relative h-6 flex items-center">
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={editorFontSize}
                  onChange={(e) => handleUpdateSetting('editorFontSize', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary relative z-10"
                />
                <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none">
                  {[12, 14, 16, 18, 20, 22, 24].map((tick) => (
                    <div key={tick} className={`w-1 h-1 rounded-full ${editorFontSize === tick ? 'bg-accent-primary' : 'bg-overlay-strong'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lockAvailable && (
        <div className="space-y-1">
          <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Privacy</h3>
          <div className="bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md hardware-accelerated">
            <div className="p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                  <LockKeyhole className="w-5 h-5 text-accent-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <label className='block text-text-primary text-[15px] font-bold'>Note Lock</label>
                  <p className='text-[13px] text-text-tertiary font-medium opacity-60'>
                    Lock individual notes via &ldquo;Lock Note&rdquo; in the note&apos;s context menu. Unlocks with {getAuthMethodLabel()}.
                  </p>
                </div>
              </div>
              <span className="flex-shrink-0 text-[12px] font-bold text-accent-success bg-accent-success/10 border border-accent-success/20 px-3 py-1 rounded-lg">
                Available
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
