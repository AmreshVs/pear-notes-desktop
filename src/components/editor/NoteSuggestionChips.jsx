import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Sparkles, X } from 'lucide-react'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  acceptFolderSuggestion,
  clearNoteSuggestion,
  dismissNoteSuggestion,
  getNoteSuggestions
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

function SuggestionChip({ label, action, hint, dismissLabel, onAccept, onDismiss }) {
  return (
    <span className='inline-flex items-center gap-2 min-w-0 rounded-full border border-dashed border-[var(--accent-selected-border)] bg-bg-secondary py-1 pl-3 pr-1 text-[13px] text-text-primary'>
      <span className='truncate'>{label}</span>
      <button
        type='button'
        onClick={onAccept}
        title={hint}
        className='shrink-0 rounded-full bg-accent-primary px-2.5 py-0.5 text-xs font-bold text-accent-on-primary hover:bg-accent-primary/90'
      >
        {action}
      </button>
      <button
        type='button'
        className='shrink-0 rounded-full p-1 text-text-tertiary hover:bg-overlay-light hover:text-text-primary'
        onClick={onDismiss}
        aria-label={dismissLabel}
        title={dismissLabel}
      >
        <X className='w-3.5 h-3.5' />
      </button>
    </span>
  )
}

function folderChipLabel(folder, folders, t) {
  if (folder?.folderKey) {
    const name = folders?.[folder.folderKey]?.title
    return name
      ? { label: t('suggestions.moveTo', { folder: name }), action: t('suggestions.move') }
      : null
  }
  return folder?.name
    ? { label: t('suggestions.newFolder', { name: folder.name }), action: t('suggestions.create') }
    : null
}

export default function NoteSuggestionChips({ noteKey, onAcceptTitle }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const suggestions = useSelector(getNoteSuggestions)
  const savedTitle = useSelector((state) => getNotesData(state)?.[noteKey]?.title)
  const folders = useSelector(getFoldersData)
  if (!noteKey || suggestions.noteKey !== noteKey) return null

  const title = String(savedTitle ?? '').trim() ? null : suggestions.title
  const folder = suggestions.folder
  const folderChip = folderChipLabel(folder, folders, t)
  if (!title && !folderChip) return null

  const dismiss = (kind) => dispatch(dismissNoteSuggestion({ noteKey, kind }))

  return (
    <div className='flex flex-wrap items-center gap-2 -mt-2 mb-4 min-w-0'>
      <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-text-tertiary'>
        <Sparkles className='w-3 h-3 text-accent-primary' aria-hidden='true' />
        {t('suggestions.label')}
      </span>
      {title && (
        <SuggestionChip
          label={t('suggestions.title', { title })}
          action={t('suggestions.use')}
          hint={t('suggestions.useTitleHint')}
          dismissLabel={t('suggestions.dismiss')}
          onAccept={() => {
            onAcceptTitle(title)
            dispatch(clearNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))
          }}
          onDismiss={() => dismiss(SUGGESTION_KIND.TITLE)}
        />
      )}
      {folderChip && (
        <SuggestionChip
          label={folderChip.label}
          action={folderChip.action}
          hint={t('suggestions.useFolderHint')}
          dismissLabel={t('suggestions.dismissFolder')}
          onAccept={() => dispatch(acceptFolderSuggestion({ noteKey }))}
          onDismiss={() => dismiss(SUGGESTION_KIND.FOLDER)}
        />
      )}
    </div>
  )
}
