import { memo, useMemo } from 'react'

import { findTermRanges, toHighlightSegments } from '@pear-notes/core/backend/noteSearch.js'

const HighlightedText = memo(({ text, terms, ranges }) => {
  const segments = useMemo(
    () => toHighlightSegments(text, ranges ?? findTermRanges(text, terms)),
    [text, terms, ranges]
  )
  return segments.map((segment, index) =>
    segment.match ? (
      <mark key={index} className='search-match'>
        {segment.text}
      </mark>
    ) : (
      <span key={index}>{segment.text}</span>
    )
  )
})

HighlightedText.displayName = 'HighlightedText'

export default HighlightedText
