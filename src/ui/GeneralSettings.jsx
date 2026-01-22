import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function GeneralSettings() {
  const [theme, setTheme] = useState('system')
  const [textSize, setTextSize] = useState(50)

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
                  onClick={() => setTheme(option.toLowerCase())}
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

          <div className="p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
             <div className="space-y-1">
              <label className='block text-text-primary text-[15px] font-bold'>Language</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Interface and system messages.</p>
            </div>
            <div className='relative group/select'>
              <select className='appearance-none bg-bg-tertiary/50 border border-white/[0.05] text-text-primary text-[13px] font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary'>
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Spanish (ES)</option>
                <option>French (FR)</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className='text-text-primary/40 font-bold text-xs uppercase tracking-[0.2em] ml-2'>Typography</h3>

        <div className="bg-bg-panel/20 border border-white/[0.05] rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-6 flex items-center justify-between border-b border-white/[0.05] group hover:bg-white/[0.02] transition-colors">
            <div className="space-y-1">
              <label className='block text-text-primary text-[15px] font-bold'>Font Family</label>
              <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Primary typeface for notes.</p>
            </div>
            <div className='relative group/select'>
              <select className='appearance-none bg-bg-tertiary/50 border border-white/[0.05] text-text-primary text-[13px] font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-accent-primary/50 transition-all cursor-pointer hover:bg-bg-tertiary'>
                <option>System Default</option>
                <option>Inter</option>
                <option>Helvetica</option>
                <option>Monospace</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none group-hover/select:text-accent-primary transition-colors' />
            </div>
          </div>

          <div className="p-6 group hover:bg-white/[0.02] transition-colors">
             <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <label className='block text-text-primary text-[15px] font-bold'>Visual Scale</label>
                <p className='text-[13px] text-text-tertiary font-medium opacity-60'>Adjust master text size.</p>
              </div>
              <span className="text-[13px] font-mono text-accent-primary bg-accent-primary/10 px-2 py-1 rounded-md">{textSize}%</span>
            </div>
            
            <div className="relative h-2 bg-bg-tertiary rounded-full overflow-hidden">
               <div className="absolute top-0 left-0 h-full bg-accent-primary rounded-full" style={{ width: `${textSize}%` }} />
               <input
                type='range'
                min='0'
                max='100'
                value={textSize}
                onChange={(e) => setTextSize(e.target.value)}
                className='absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer'
              />
            </div>
            <div className="flex justify-between mt-3 text-[10px] uppercase font-bold text-text-tertiary/50 tracking-widest">
              <span>Compact</span>
              <span>Comfortable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
