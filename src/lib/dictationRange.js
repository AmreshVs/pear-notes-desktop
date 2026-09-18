import { Selection } from '@tiptap/pm/state'

const CARET_CLASS = 'dictation-caret'
const MIN_CARET_HEIGHT = 14

function clampRange(editor, dictation) {
  const size = editor.state.doc.content.size
  const from = Math.max(0, Math.min(dictation.from, size))
  const to = Math.max(from, Math.min(from + dictation.length, size))
  return { from, to }
}

function ensureCaret(dictation) {
  if (dictation.caret) return dictation.caret
  const caret = document.createElement('div')
  caret.className = CARET_CLASS
  document.body.appendChild(caret)
  dictation.caret = caret
  return caret
}

export function placeDictationCaret(editor, dictation) {
  if (!dictation || !editor || editor.isDestroyed) return
  const caret = ensureCaret(dictation)
  try {
    const { to } = clampRange(editor, dictation)
    const coords = editor.view.coordsAtPos(to)
    caret.style.left = `${coords.left}px`
    caret.style.top = `${coords.top}px`
    caret.style.height = `${Math.max(MIN_CARET_HEIGHT, coords.bottom - coords.top)}px`
  } catch {
    caret.style.height = '0px'
  }
}

function scrollCaretIntoView(dictation) {
  dictation.caret?.scrollIntoView?.({ block: 'nearest' })
}

export function startDictation(editor) {
  if (!editor || editor.isDestroyed) return null
  const { doc, selection } = editor.state
  const size = doc.content.size
  const raw = selection.empty ? selection.from : selection.to
  const at = Number.isFinite(raw) && raw > 0 ? Math.min(raw, size) : size
  const before = at > 0 ? doc.textBetween(Math.max(0, at - 1), at) : ''
  const dictation = { from: at, length: 0, prefix: before.trim() ? ' ' : '', caret: null }
  placeDictationCaret(editor, dictation)
  return dictation
}

export function updateDictation(editor, dictation, spokenText) {
  if (!dictation || !editor || editor.isDestroyed) return
  const spoken = String(spokenText ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  const text = spoken ? dictation.prefix + spoken : ''
  const { from, to } = clampRange(editor, dictation)
  if (!text && to === from) return
  const tr = editor.state.tr
  if (text) tr.insertText(text, from, to)
  else tr.delete(from, to)
  dictation.length = text.length
  tr.setSelection(Selection.near(tr.doc.resolve(from + text.length)))
  editor.view.dispatch(tr)
  placeDictationCaret(editor, dictation)
  scrollCaretIntoView(dictation)
}

export function endDictation(editor, dictation, { commit }) {
  if (!dictation) return
  dictation.caret?.remove()
  dictation.caret = null
  if (commit || !editor || editor.isDestroyed) return
  const { from, to } = clampRange(editor, dictation)
  if (to <= from) return
  const tr = editor.state.tr.delete(from, to)
  tr.setSelection(Selection.near(tr.doc.resolve(from)))
  editor.view.dispatch(tr)
}
