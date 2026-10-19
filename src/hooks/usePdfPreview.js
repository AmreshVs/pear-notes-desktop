import { useEffect, useState } from 'react'

import { getPdfPreview } from '../lib/pdfPreview'

export default function usePdfPreview(url, { persist = true } = {}) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let active = true

    getPdfPreview(url, { persist }).then((result) => {
      if (active) setPreview(result)
    })

    return () => {
      active = false
    }
  }, [url, persist])

  return preview
}
