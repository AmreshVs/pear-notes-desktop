import { Extension } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'

export function deleteEmptyFirstLine(editor) {
  const { state, view } = editor
  const { selection, doc } = state
  const { $from, empty } = selection
  if (!empty || $from.depth !== 1 || $from.index(0) !== 0 || doc.childCount < 2) return false
  const block = $from.parent
  if (block.type.name !== 'paragraph' || block.content.size > 0) return false
  const tr = state.tr.delete(0, block.nodeSize)
  tr.setSelection(Selection.near(tr.doc.resolve(0), 1))
  view.dispatch(tr.scrollIntoView())
  return true
}

export const EmptyFirstLine = Extension.create({
  name: 'emptyFirstLine',
  priority: 1000,
  addKeyboardShortcuts() {
    return { Backspace: () => deleteEmptyFirstLine(this.editor) }
  }
})
