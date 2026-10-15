import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { ChevronDown, File, FileText, Image, Mic, NotebookText, Search } from 'lucide-react'

import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  ATTACHMENT_FILTER_ALL,
  ATTACHMENT_GROUP,
  ATTACHMENT_KIND,
  ATTACHMENT_KINDS,
  attachmentId,
  groupAttachments
} from '@pear-notes/core/store/services/noteAttachments.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import { selectNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { useAttachments } from '../../hooks/useAttachments'
import { showContextMenu } from '../../lib/contextMenu'
import { createDownloadLink, downloadAsBlob } from '../../lib/fileManager'
import { attachmentName } from '../../utils/attachmentName'
import MediaPreviewModal from '../modals/MediaPreviewModal'

import { FileRow, PhotoTile } from './AttachmentItems'
import ToolPanel, { TOOL_GROUP_HEADER_CLASS, ToolEmpty } from './ToolPanel'

const COLLAPSED_PHOTOS = 6
const COLLAPSED_FILES = 2
const FILTERS = [ATTACHMENT_FILTER_ALL, ...ATTACHMENT_KINDS]
const GROUPS = [ATTACHMENT_GROUP.FOLDER, ATTACHMENT_GROUP.TYPE, ATTACHMENT_GROUP.MONTH]
const PREVIEW_TYPES = { [ATTACHMENT_KIND.PHOTO]: 'image/', [ATTACHMENT_KIND.AUDIO]: 'audio/' }
const MONTH_FORMAT = { month: 'long', year: 'numeric' }
const MENU = { OPEN: 'open', SAVE: 'save', COPY: 'copy' }

const FILTER_ICONS = {
  [ATTACHMENT_KIND.PHOTO]: Image,
  [ATTACHMENT_KIND.PDF]: FileText,
  [ATTACHMENT_KIND.AUDIO]: Mic,
  [ATTACHMENT_KIND.FILE]: File
}

function sectionLabel(section, by, folderNames, t, language) {
  if (by === ATTACHMENT_GROUP.TYPE) return t(`attachmentsView.filter.${section.key}`)
  if (by === ATTACHMENT_GROUP.MONTH) {
    const [year, month] = section.key.split('-').map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString(language, MONTH_FORMAT)
  }
  return folderNames.get(section.key) || t('attachmentsView.noFolder')
}

export default function AttachmentsList({ onToggleSidebar, isSidebarCollapsed }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const store = useStore()
  const { items } = useAttachments()
  const folders = useSelector(getFolders)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState(ATTACHMENT_FILTER_ALL)
  const [by, setBy] = useState(ATTACHMENT_GROUP.FOLDER)
  const [expanded, setExpanded] = useState(() => new Set())
  const [preview, setPreview] = useState(null)
  const [download, setDownload] = useState(null)
  const previewUrl = useSelector((state) => getHyperdriveAddress(state, preview?.url))

  const folderNames = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder.name])),
    [folders]
  )
  const grouped = useMemo(
    () =>
      groupAttachments(items ?? [], {
        by,
        kind,
        query,
        folders: [...folderNames.keys()],
        allNotesKey: ALL_NOTES_KEY
      }),
    [items, by, kind, query, folderNames]
  )

  const openNote = useCallback(
    (item) => {
      setPreview(null)
      dispatch(selectNote(item.noteKey))
    },
    [dispatch]
  )

  const save = useCallback(
    async (item) => {
      const source = getHyperdriveAddress(store.getState(), item.url)
      if (download || !source) return
      const id = attachmentId(item)
      setDownload({ id, progress: 0 })
      try {
        const blob = await downloadAsBlob(source, (progress) => setDownload({ id, progress }))
        createDownloadLink(blob, attachmentName(item, t))
      } catch (error) {
        console.error('Attachment download failed:', error)
      } finally {
        setDownload(null)
      }
    },
    [download, store, t]
  )

  const onMenu = useCallback(
    (item) => async (event) => {
      event.preventDefault()
      const result = await showContextMenu([
        { id: MENU.OPEN, label: t('attachmentsView.openNote') },
        { type: 'separator' },
        { id: MENU.SAVE, label: t('attachmentsView.save') },
        { id: MENU.COPY, label: t('attachmentsView.copyName') }
      ])
      if (result === MENU.OPEN) openNote(item)
      else if (result === MENU.SAVE) save(item)
      else if (result === MENU.COPY) navigator.clipboard?.writeText(attachmentName(item, t))
    },
    [openNote, save, t]
  )

  const toggleSection = (key) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const summary =
    items && items.length > 0
      ? [
          t('attachmentsView.summary', {
            count: grouped.total,
            size: formatBytes(grouped.bytes)
          }),
          grouped.missing > 0 && t('attachmentsView.missing', { count: grouped.missing })
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  const openGroupMenu = async () => {
    const result = await showContextMenu(
      GROUPS.map((value) => ({
        id: value,
        label: t(`attachmentsView.group.${value}`),
        checked: by === value
      }))
    )
    if (GROUPS.includes(result)) setBy(result)
  }

  const visibleFilters = FILTERS.filter(
    (value) => value === ATTACHMENT_FILTER_ALL || value === kind || (grouped.counts[value] ?? 0) > 0
  )

  const renderFilter = (value) => {
    const active = kind === value
    const label = t(`attachmentsView.filter.${value}`)
    const Icon = FILTER_ICONS[value]
    const count = grouped.counts[value] ?? 0
    return (
      <button
        key={value}
        type='button'
        aria-pressed={active}
        aria-label={Icon ? `${label} ${count}` : label}
        title={Icon ? label : undefined}
        onClick={() => setKind(value)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${active ? 'bg-accent-primary/15 text-accent-primary' : 'bg-bg-tertiary/60 text-text-secondary hover:text-text-primary'}`}
      >
        {Icon ? (
          <>
            <Icon className='w-3.5 h-3.5' />
            <span className='tabular-nums'>{count}</span>
          </>
        ) : (
          label
        )}
      </button>
    )
  }

  const renderSection = (section) => {
    const open = expanded.has(section.key)
    const photos = open ? section.photos : section.photos.slice(0, COLLAPSED_PHOTOS)
    const files = open ? section.files : section.files.slice(0, COLLAPSED_FILES)
    const hidden = section.count - photos.length - files.length
    return (
      <section key={section.key || 'unfiled'} className='mb-6'>
        <h3 className={`${TOOL_GROUP_HEADER_CLASS} flex items-baseline justify-between gap-3`}>
          <span className='truncate'>
            {t('attachmentsView.sectionTitle', {
              name: sectionLabel(section, by, folderNames, t, i18n.language),
              count: section.count
            })}
          </span>
          {(hidden > 0 || open) && (
            <button
              type='button'
              onClick={() => toggleSection(section.key)}
              aria-expanded={open}
              className='shrink-0 text-xs font-semibold tracking-normal text-accent-primary hover:underline'
            >
              {open ? t('attachmentsView.showLess') : t('attachmentsView.seeAll')}
            </button>
          )}
        </h3>
        {photos.length > 0 && (
          <div className='grid grid-cols-6 gap-1.5 px-6 pt-3 pb-3'>
            {photos.map((item) => (
              <PhotoTile
                key={attachmentId(item)}
                item={item}
                onOpen={() => setPreview(item)}
                onMenu={onMenu(item)}
              />
            ))}
          </div>
        )}
        {files.map((item, index) => (
          <FileRow
            key={attachmentId(item)}
            item={item}
            last={index === files.length - 1}
            onOpen={() => setPreview(item)}
            onMenu={onMenu(item)}
          />
        ))}
      </section>
    )
  }

  const empty = items && items.length === 0
  const noMatches = items && items.length > 0 && grouped.sections.length === 0

  return (
    <ToolPanel
      title={t('tools.attachments')}
      status={summary}
      onToggleSidebar={onToggleSidebar}
      isSidebarCollapsed={isSidebarCollapsed}
      controls={
        items &&
        items.length > 0 && (
          <div className='flex flex-col gap-3'>
            <div className='relative group'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-accent-primary transition-colors' />
              <input
                type='search'
                aria-label={t('attachmentsView.searchPlaceholder')}
                placeholder={t('attachmentsView.searchPlaceholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className='w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-bg-tertiary/30 text-text-primary placeholder-text-tertiary/40 border border-border-primary/50 focus:border-accent-primary/40 focus:bg-bg-tertiary/60 transition-all shadow-inner'
              />
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='flex flex-wrap gap-1.5 min-w-0'>
                {visibleFilters.map(renderFilter)}
              </div>
              <button
                type='button'
                onClick={openGroupMenu}
                aria-haspopup='menu'
                title={t('attachmentsView.groupBy')}
                className='ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60 transition-colors'
              >
                {t(`attachmentsView.byGroup.${by}`)}
                <ChevronDown className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
        )
      }
    >
      {empty && (
        <ToolEmpty title={t('attachmentsView.emptyTitle')} body={t('attachmentsView.emptyBody')} />
      )}
      {noMatches && <ToolEmpty title={t('attachmentsView.noResults')} />}
      {grouped.sections.map(renderSection)}
      {preview && previewUrl && (
        <MediaPreviewModal
          url={previewUrl}
          fileName={attachmentName(preview, t)}
          fileType={preview.fileType || PREVIEW_TYPES[preview.kind] || ''}
          onClose={() => setPreview(null)}
          onDownload={() => save(preview)}
          isDownloading={download?.id === attachmentId(preview)}
          downloadProgress={download?.progress ?? 0}
          extraAction={
            <button
              type='button'
              onClick={(event) => {
                event.stopPropagation()
                openNote(preview)
              }}
              className='h-10 px-4 rounded-full text-sm font-semibold text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center gap-2 shadow-md'
            >
              <NotebookText className='w-4 h-4' />
              {t('attachmentsView.openNote')}
            </button>
          }
        />
      )}
    </ToolPanel>
  )
}
