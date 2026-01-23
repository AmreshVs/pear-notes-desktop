import { ChevronDown } from 'lucide-react'


import { useSelector, useDispatch } from 'react-redux'
import {
  getTheme,
  getFontFamily,
  setTheme,
  updateSetting
} from '../store/slices/settingsSlice'

export default function GeneralSettings() {
  const dispatch = useDispatch()
  const theme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)

  const handleUpdateSetting = (key, value) => {
    dispatch(updateSetting({ key, value }))
  }

  return (
    <div className='space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto'>
      <div className="space-y-6">
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2'>Interface</h3>
        
        <div className="bg-bg-panel/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-6 flex items-center justify-between border-b border-white/[0.05] group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-1">
              <label className='block text-text-primary text-[15px] font-bold'>App Theme</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Select your preferred aesthetic.</p>
            </div>
            <div className='flex bg-bg-tertiary/50 p-1 rounded-xl border border-white/[0.05]'>
              {['System', 'Light', 'Dark'].map((option) => (
                <button
                  key={option}
                  onClick={() => dispatch(setTheme(option.toLowerCase()))}
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all duration-300 ${
                    theme === option.toLowerCase()
                      ? 'bg-accent-primary text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.05]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2'>Editor</h3>
        <div className="bg-bg-panel/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-6 flex items-center justify-between border-b border-white/[0.05] group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-1">
              <label className='block text-text-primary text-[15px] font-bold'>Font Family</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Primary typeface for notes.</p>
            </div>
            <div className='relative group/select'>
              <select 
                value={fontFamily}
                onChange={(e) => handleUpdateSetting('fontFamily', e.target.value)}
                className='appearance-none bg-bg-tertiary/50 border border-white/[0.05] text-text-primary text-[13px] font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary'
              >
                <option value="Inter">Inter</option>
                <option value="System">System Default</option>
                <option value="Serif">Serif</option>
                <option value="Mono">Monospace</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
