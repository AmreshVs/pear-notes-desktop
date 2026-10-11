import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { FolderInput, Sparkles, X } from 'lucide-react'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  acceptFolderSuggestion,
  clearNoteSuggestion,
  dismissNoteSuggestion,
  getNoteSuggestions
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

function SuggestionChip({ icon: Icon, label, hint, dismissLabel, onAccept, onDismiss }) {
  return (
    <div className='flex items-center gap-1 min-w-0'>
      <button
        type='button'
        onClick={onAccept}
        title={hint}
        className='inline-flex items-center gap-2 min-w-0 rounded-full border border-[var(--accent-selected-border)] bg-[var(--accent-selected-bg)] px-3 py-1 text-sm text-text-primary hover:text-accent-primary'
      >
        <Icon className='w-4 h-4 text-accent-primary flex-shrink-0' aria-hidden='true' />
        <span className='truncate'>{label}</span>
      </button>
      <button
        type='button'
        className='rounded-full p-1 text-text-tertiary hover:bg-overlay-light hover:text-text-primary'
        onClick={onDismiss}
        aria-label={dismissLabel}
        title={dismissLabel}
      >
        <X className='w-3.5 h-3.5' />
      </button>
    </div>
  )
}

function folderChipLabel(folder, folders, t) {
  if (folder?.folderKey) {
    const name = folders?.[folder.folderKey]?.title
    return name ? t('suggestions.moveTo', { folder: name }) : null
  }
  return folder?.name ? t('suggestions.newFolder', { name: folder.name }) : null
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
  const folderLabel = folderChipLabel(folder, folders, t)
  if (!title && !folderLabel) return null

  const dismiss = (kind) => dispatch(dismissNoteSuggestion({ noteKey, kind }))

  return (
    <div className='flex flex-wrap items-center gap-2 -mt-2 mb-4 min-w-0'>
      {title && (
        <SuggestionChip
          icon={Sparkles}
          label={t('suggestions.title', { title })}
          hint={t('suggestions.useTitleHint')}
          dismissLabel={t('suggestions.dismiss')}
          onAccept={() => {
            onAcceptTitle(title)
            dispatch(clearNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))
          }}
          onDismiss={() => dismiss(SUGGESTION_KIND.TITLE)}
        />
      )}
      {folderLabel && (
        <SuggestionChip
          icon={FolderInput}
          label={folderLabel}
          hint={t('suggestions.useFolderHint')}
          dismissLabel={t('suggestions.dismissFolder')}
          onAccept={() => dispatch(acceptFolderSuggestion({ noteKey }))}
          onDismiss={() => dismiss(SUGGESTION_KIND.FOLDER)}
        />
      )}
    </div>
  )
}
