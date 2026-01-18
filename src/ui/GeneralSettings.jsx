import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function GeneralSettings() {
  const [theme, setTheme] = useState('system')
  const [textSize, setTextSize] = useState(50)

  return (
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
  )
}
