import { ATTACHMENT_KIND } from '@pear-notes/core/store/services/noteAttachments.js'

const FALLBACK_NAMES = {
  [ATTACHMENT_KIND.PHOTO]: 'attachmentsView.photo',
  [ATTACHMENT_KIND.AUDIO]: 'attachmentsView.recording'
}

export function attachmentName(item, t) {
  return item.fileName || t(FALLBACK_NAMES[item.kind] || 'attachmentsView.file')
}
