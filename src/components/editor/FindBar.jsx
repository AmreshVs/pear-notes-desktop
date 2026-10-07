import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'

import { SEARCH_QUERY_MAX_LENGTH } from '@pear-notes/core/constant.js'

export default function FindBar({
  query,
  onQueryChange,
  count,
  active,
  inputRef,
  onNext,
  onPrevious,
  onClose,
  onEngage
}) {
  const { t } = useTranslation()
  const hasQuery = query.trim().length > 0

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) onPrevious()
      else onNext()
    }
  }

  const status = !hasQuery
    ? ''
    : count > 0
      ? t('noteEditor.find.matchCount', { current: active + 1, total: count })
      : t('noteEditor.find.noMatches')

  return (
    <div
      role='search'
      aria-label={t('noteEditor.find.label')}
      className='flex items-center gap-1 rounded-xl border border-border-primary bg-bg-secondary py-1 pl-3 pr-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150'
    >
      <Search className='h-3.5 w-3.5 shrink-0 text-text-tertiary' />
      <input
        ref={inputRef}
        type='text'
        value={query}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onEngage}
        placeholder={t('noteEditor.find.placeholder')}
        aria-label={t('noteEditor.find.placeholder')}
        className='w-40 bg-transparent px-1 py-1 text-sm text-text-primary placeholder-text-tertiary/60 outline-none'
      />
      <span
        aria-live='polite'
        className={`min-w-[4.5rem] text-right text-xs font-semibold tabular-nums ${count > 0 ? 'text-text-secondary' : 'text-text-tertiary'}`}
      >
        {status}
      </span>
      <div className='ml-1 flex items-center'>
        <button
          type='button'
          onClick={onPrevious}
          disabled={count === 0}
          aria-label={t('noteEditor.find.previous')}
          className='rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary disabled:opacity-40 disabled:hover:bg-transparent'
        >
          <ChevronUp className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={onNext}
          disabled={count === 0}
          aria-label={t('noteEditor.find.next')}
          className='rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary disabled:opacity-40 disabled:hover:bg-transparent'
        >
          <ChevronDown className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={onClose}
          aria-label={t('noteEditor.find.close')}
          className='rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}
