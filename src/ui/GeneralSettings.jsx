import { ChevronDown } from 'lucide-react'
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
import {
  getAppBehaviorPreference,
  setAppBehaviorPreference,
  applyCloseToTray,
  applyStartAtLogin,
  CLOSE_TO_TRAY_KEY,
  START_AT_LOGIN_KEY
} from '../lib/appBehavior'
import {
  getMediaSyncFlag,
  setMediaSyncFlag,
  MEDIA_SYNC_PAUSED_KEY,
  METERED_CONNECTION_KEY
} from '../lib/mediaSyncPolicy'

export default function GeneralSettings() {
  const dispatch = useDispatch()
  const theme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const [closeToTray, setCloseToTray] = useState(true)
  const [startAtLogin, setStartAtLogin] = useState(false)
  const [mediaPaused, setMediaPaused] = useState(false)
  const [metered, setMetered] = useState(false)

  useEffect(() => {
    let active = true
    getAppBehaviorPreference(CLOSE_TO_TRAY_KEY, true).then((v) => {
      if (active) setCloseToTray(v)
    })
    getAppBehaviorPreference(START_AT_LOGIN_KEY, false).then((v) => {
      if (active) setStartAtLogin(v)
    })
    getMediaSyncFlag(MEDIA_SYNC_PAUSED_KEY).then((v) => {
      if (active) setMediaPaused(v)
    })
    getMediaSyncFlag(METERED_CONNECTION_KEY).then((v) => {
      if (active) setMetered(v)
    })
    return () => {
      active = false
    }
  }, [])

  const handleToggleMediaPaused = () => {
    const next = !mediaPaused
    setMediaPaused(next)
    setMediaSyncFlag(MEDIA_SYNC_PAUSED_KEY, next)
  }

  const handleToggleMetered = () => {
    const next = !metered
    setMetered(next)
    setMediaSyncFlag(METERED_CONNECTION_KEY, next)
  }

  const handleUpdateSetting = (key, value) => {
    dispatch(updateSetting({ key, value }))
  }

  const handleToggleCloseToTray = () => {
    const next = !closeToTray
    setCloseToTray(next)
    setAppBehaviorPreference(CLOSE_TO_TRAY_KEY, next)
    applyCloseToTray(next)
  }

  const handleToggleStartAtLogin = () => {
    const next = !startAtLogin
    setStartAtLogin(next)
    setAppBehaviorPreference(START_AT_LOGIN_KEY, next)
    applyStartAtLogin(next)
  }

  return (
    <div className='space-y-12 max-w-2xl mx-auto'>
      <div className="space-y-1">
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Interface</h3>
        
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
                      ? 'bg-accent-primary text-accent-on-primary shadow-sm'
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
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Notes List</h3>
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
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Editor</h3>
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

      <div className="space-y-1">
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Startup & Background</h3>
        <div className="bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md hardware-accelerated">
          <div className="p-6 flex items-center justify-between gap-6 border-b border-border-primary group hover:bg-overlay-faint transition-colors">
            <div className="space-y-1 min-w-0">
              <label className='block text-text-primary text-[15px] font-bold'>Keep Running in Background</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Closing the window keeps PearNotes running in the tray so your notes stay in sync.</p>
            </div>
            <button
              onClick={handleToggleCloseToTray}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${closeToTray ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${closeToTray ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors">
            <div className="space-y-1 min-w-0">
              <label className='block text-text-primary text-[15px] font-bold'>Start at Login</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Launch PearNotes automatically when you sign in to this device.</p>
            </div>
            <button
              onClick={handleToggleStartAtLogin}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${startAtLogin ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${startAtLogin ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className='space-y-1'>
        <h3 className='text-text-secondary font-bold text-xs uppercase tracking-[0.2em] ml-2 mb-3'>Media Sync</h3>
        <div className='bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden backdrop-blur-md divide-y divide-border-primary'>
          <div className="p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors">
            <div className="space-y-1 min-w-0">
              <label className='block text-text-primary text-[15px] font-bold'>Pause Media Transfers</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Hold photos, video, and file transfers. Notes, folders, and settings keep syncing.</p>
            </div>
            <button
              onClick={handleToggleMediaPaused}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${mediaPaused ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${mediaPaused ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="p-6 flex items-center justify-between gap-6 group hover:bg-overlay-faint transition-colors">
            <div className="space-y-1 min-w-0">
              <label className='block text-text-primary text-[15px] font-bold'>Metered Connection</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Also holds media transfers. Desktop cannot detect metered networks automatically, so set this yourself.</p>
            </div>
            <button
              onClick={handleToggleMetered}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${metered ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${metered ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        {(mediaPaused || metered) && (
          <p className='text-[12px] text-text-tertiary ml-2 mt-2'>Media transfers are held. Queued items resume automatically once media is allowed again.</p>
        )}
      </div>

    </div>
  )
}