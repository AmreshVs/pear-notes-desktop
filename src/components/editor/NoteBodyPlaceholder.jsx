import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getNoteSummary } from '@pear-notes/core/utils.js'

import LocalAiShimmer from '../modals/LocalAiShimmer'

const SHIMMER_DELAY_MS = 500

export default function NoteBodyPlaceholder({ noteData, fontSize, fontFamily }) {
  const { t } = useTranslation()
  const [showShimmer, setShowShimmer] = useState(false)
  const preview = getNoteSummary(noteData).preview

  useEffect(() => {
    const timer = setTimeout(() => setShowShimmer(true), SHIMMER_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className='flex-1 flex overflow-hidden min-w-0'>
      <div className='flex-1 overflow-y-auto custom-scrollbar pt-16 bg-bg-primary'>
        <div className='max-w-4xl px-6 py-4 w-full' aria-busy='true'>
          <h1
            className={`text-4xl font-black mb-4 leading-tight tracking-tighter p-0 break-words ${
              noteData.title ? 'text-text-primary' : 'text-text-tertiary'
            }`}
            style={{ fontSize: `${fontSize * 2}px`, fontFamily }}
          >
            {noteData.title || t('noteEditor.titlePlaceholder')}
          </h1>
          {preview && (
            <p
              className='text-text-primary mb-4 break-words'
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {preview}
            </p>
          )}
          {showShimmer && <LocalAiShimmer />}
        </div>
      </div>
    </div>
  )
}
