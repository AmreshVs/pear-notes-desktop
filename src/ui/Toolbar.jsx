import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react'

export default function Toolbar({ searchQuery, onSearchChange }) {
  return (
    <div
      className='h-12 flex items-center px-5 gap-4'
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-xs)',
        backdropFilter: 'var(--blur-sm)'
      }}
    >
      {/* Left: Navigation */}
      <div className='flex items-center gap-2'>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <ChevronLeft className='w-4 h-4' />
        </button>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <ChevronRight className='w-4 h-4' />
        </button>
        <button
          className='p-1.5 rounded transition-colors'
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <MoreHorizontal className='w-4 h-4' />
        </button>
      </div>

      {/* Center: Search */}
      <div className='flex-1 max-w-md mx-auto'>
        <div className='relative'>
          <Search
            className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4'
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type='text'
            placeholder='Search All Notes'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-9 pr-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-1'
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)'
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-primary)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>
    </div>
  )
}
