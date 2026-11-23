import { Fragment, Slice } from '@tiptap/pm/model'

const INLINE_IMAGE_SRC = /^(data:|blob:|webkit-fake-url:)/i
const READABLE_IMAGE_SRC = /^(data:image\/|blob:)/i

const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg'
}

let pendingInlineSrcs = []

function stripInlineImages(fragment, found) {
  let changed = false
  const nodes = []
  fragment.forEach((node) => {
    if (node.type.name === 'image' && INLINE_IMAGE_SRC.test(node.attrs.src || '')) {
      found.push(node.attrs.src)
      changed = true
      return
    }
    if (!node.isLeaf && node.content.size) {
      const inner = stripInlineImages(node.content, found)
      if (inner !== node.content) {
        changed = true
        const kept = node.type.validContent(inner)
          ? node.copy(inner)
          : node.type.createAndFill(node.attrs, inner, node.marks)
        if (kept) nodes.push(kept)
        return
      }
    }
    nodes.push(node)
  })
  return changed ? Fragment.from(nodes) : fragment
}

function maxOpenDepth(fragment, side) {
  let depth = 0
  let node = side === 'start' ? fragment.firstChild : fragment.lastChild
  while (node && !node.isLeaf) {
    depth += 1
    node = side === 'start' ? node.firstChild : node.lastChild
  }
  return depth
}

export function transformPastedInlineImages(slice, view) {
  pendingInlineSrcs = []
  if (view.dragging) return slice
  const found = []
  const content = stripInlineImages(slice.content, found)
  if (!found.length) return slice
  pendingInlineSrcs = found
  if (!content.size) return Slice.empty
  return new Slice(
    content,
    Math.min(slice.openStart, maxOpenDepth(content, 'start')),
    Math.min(slice.openEnd, maxOpenDepth(content, 'end'))
  )
}

export function takePendingInlineImages() {
  const srcs = pendingInlineSrcs
  pendingInlineSrcs = []
  return srcs
}

async function srcToImageFile(src, index) {
  if (!READABLE_IMAGE_SRC.test(src)) return null
  try {
    const blob = await (await fetch(src)).blob()
    const extension = IMAGE_EXTENSIONS[blob.type]
    if (!extension) return null
    return new File([blob], `image-${Date.now()}-${index}.${extension}`, { type: blob.type })
  } catch {
    return null
  }
}

export async function inlineImageFiles(srcs) {
  const files = await Promise.all(srcs.map(srcToImageFile))
  return files.filter(Boolean)
}
