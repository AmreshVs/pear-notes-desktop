import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { backendApi } from '@pear-notes/core/backend/api.js'

const SEARCH_DELAY_MS = 150
const SEARCH_LIMIT = 30
const NO_RESULTS = { results: [], total: 0 }

export default function AskVaultSearchResults({
  query,
  folderKey,
  notesData,
  firstResultRef,
  onOpen
}) {
  const { t } = useTranslation()
  const [found, setFound] = useState(null)
  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed) return
    let live = true
    const timer = setTimeout(() => {
      backendApi
        .searchNotes({ query: trimmed, folderKey, limit: SEARCH_LIMIT })
        .then((response) => {
          if (live) setFound({ query: trimmed, ...(response ?? NO_RESULTS) })
        })
        .catch(() => {
          if (live) setFound({ query: trimmed, ...NO_RESULTS })
        })
    }, SEARCH_DELAY_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [folderKey, trimmed])

  const results = trimmed && found ? found.results : null

  useEffect(() => {
    firstResultRef.current = results?.[0]?.key ?? null
  }, [firstResultRef, results])

  if (!results) return null
  if (!results.length) {
    return <p className='px-5 py-4 text-sm text-text-tertiary'>{t('localAi.askVault.noResults')}</p>
  }
  return (
    <div className='flex flex-col gap-0.5 px-3 py-3 overflow-y-auto custom-scrollbar min-h-0 max-h-[50vh]'>
      {results.map((result) => (
        <button
          key={result.key}
          onClick={() => onOpen(result.key)}
          className='flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-left hover:bg-overlay-subtle transition-colors'
        >
          <span className='text-sm font-semibold text-text-primary truncate max-w-full'>
            {notesData?.[result.key]?.title || t('activity.untitledNote')}
          </span>
          {result.snippet && (
            <span className='text-xs text-text-tertiary line-clamp-1'>{result.snippet}</span>
          )}
        </button>
      ))}
    </div>
  )
}
