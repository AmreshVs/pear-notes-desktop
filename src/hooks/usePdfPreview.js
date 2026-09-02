import { useEffect, useState } from 'react'

import { getPdfPreview } from '../lib/pdfPreview'

export default function usePdfPreview(url) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let active = true

    getPdfPreview(url).then((result) => {
      if (active) setPreview(result)
    })

    return () => {
      active = false
    }
  }, [url])

  return preview
}
