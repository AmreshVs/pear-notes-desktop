import { noteAttachmentText } from '@pear-notes/core/store/services/attachmentText.js'

const PDF_PAGE_LIMIT = 20
const TEXT_LIMIT = 20000
const CACHE_LIMIT = 64
const PDF_BYTE_LIMIT = 25 * 1024 * 1024

const cache = new Map()
let enginePromise = null

const loadEngine = () => {
  if (!enginePromise) enginePromise = import('../pdfEngine')
  return enginePromise
}

async function pdfText(url) {
  if (cache.has(url)) return cache.get(url)
  const { getDocument } = await loadEngine()
  const response = await fetch(url)
  if (Number(response.headers.get('content-length')) > PDF_BYTE_LIMIT) return ''
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > PDF_BYTE_LIMIT) return ''
  const bytes = new Uint8Array(buffer)
  const pdf = await getDocument({ data: bytes }).promise
  const pages = []
  let length = 0
  try {
    for (
      let page = 1;
      page <= Math.min(pdf.numPages, PDF_PAGE_LIMIT) && length < TEXT_LIMIT;
      page++
    ) {
      const content = await (await pdf.getPage(page)).getTextContent()
      const text = content.items
        .map((item) => (item.hasEOL ? `${item.str}\n` : item.str))
        .join('')
        .trim()
      pages.push(text)
      length += text.length
    }
  } finally {
    pdf.destroy()
  }
  const text = pages.join('\n').slice(0, TEXT_LIMIT)
  cache.set(url, text)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
  return text
}

export const attachmentText = (value, { resolveUrl }) =>
  noteAttachmentText(value, { resolveUrl, readPdf: pdfText })
