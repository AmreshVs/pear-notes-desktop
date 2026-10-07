import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  getSearchScope,
  SEARCH_SCOPE,
  setSearchScope
} from '@pear-notes/core/store/slices/searchSlice.js'

const SCOPE_BUTTON =
  'flex-1 min-w-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors truncate'

export default function SearchScopeBar({ folderName }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const scope = useSelector(getSearchScope)

  const scopeButton = (value, label) => {
    const active = scope === value
    return (
      <button
        type='button'
        role='radio'
        aria-checked={active}
        onClick={() => dispatch(setSearchScope(value))}
        className={`${SCOPE_BUTTON} ${active ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      role='radiogroup'
      aria-label={t('search.scopeLabel')}
      className='mt-2 flex items-center rounded-lg bg-bg-tertiary/60 p-0.5'
    >
      {scopeButton(SEARCH_SCOPE.FOLDER, folderName)}
      {scopeButton(SEARCH_SCOPE.ALL, t('search.scopeAll'))}
    </div>
  )
}
