import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react'

export default function Toolbar({ searchQuery, onSearchChange }) {
  return (
    <div className='h-12 flex items-center px-5 gap-4 bg-bg-secondary border-b border-border-primary shadow-xs backdrop-blur-sm'>
      <div className='flex items-center gap-2'>
        <button className='p-1.5 rounded transition-colors text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary'>
          <ChevronLeft className='w-4 h-4' />
        </button>
        <button className='p-1.5 rounded transition-colors text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary'>
          <ChevronRight className='w-4 h-4' />
        </button>
        <button className='p-1.5 rounded transition-colors text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary'>
          <MoreHorizontal className='w-4 h-4' />
        </button>
      </div>

      <div className='flex-1 max-w-md mx-auto'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary' />
          <input
            type='text'
            placeholder='Search All Notes'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-9 pr-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-1 bg-bg-primary border border-border-primary text-text-primary focus:border-accent-primary focus:ring-accent-primary'
          />
        </div>
      </div>
    </div>
  )
}
