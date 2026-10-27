import test from 'brittle'

import { ATTACHMENT_KIND } from '@pear-notes/core/store/services/noteAttachments.js'

import { attachmentName } from '../src/utils/attachmentName.js'

const key = (k) => k

test('attachment shows its file name, else a label for its kind', (t) => {
  t.is(attachmentName({ fileName: 'plan.pdf', kind: ATTACHMENT_KIND.PHOTO }, key), 'plan.pdf')
  t.is(attachmentName({ kind: ATTACHMENT_KIND.PHOTO }, key), 'attachmentsView.photo')
  t.is(attachmentName({ kind: ATTACHMENT_KIND.AUDIO }, key), 'attachmentsView.recording')
  t.is(attachmentName({ kind: 'other' }, key), 'attachmentsView.file')
})
