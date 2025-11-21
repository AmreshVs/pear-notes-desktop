import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react'

export default function Toolbar({ searchQuery, onSearchChange }) {
  return (
    <div className='h-12 flex items-center px-5 gap-4 bg-bg-secondary border-b border-border-primary'>
      <div className='flex items-center gap-2'>
        <button className='p-1.5 rounded transition-colors text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'>
          <ChevronLeft className='w-4 h-4' />
        </button>
        <button className='p-1.5 rounded transition-colors text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'>
          <ChevronRight className='w-4 h-4' />
        </button>
        <button className='p-1.5 rounded transition-colors text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'>
          <MoreHorizontal className='w-4 h-4' />
        </button>
      </div>

      <div className='flex-1 max-w-md mx-auto'>
        <div className='relative group'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-secondary group-focus-within:text-accent-primary transition-colors' />
          <input
            type='text'
            placeholder='Search'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-9 pr-3 py-1.5 rounded-md text-[13px] focus:outline-none bg-bg-tertiary text-text-primary placeholder-text-tertiary transition-all'
          />
        </div>
      </div>
    </div>
  )
}
