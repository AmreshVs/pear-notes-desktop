import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Opening an AI tool moves focus off the editor, and a browser paints the
// selection of an unfocused contenteditable in a washed-out grey — if it keeps
// showing it at all. That left no sign of what the tool was about to act on, so
// the range is re-drawn as a decoration and the real selection is collapsed.
// It survives until the user clicks somewhere else in the note.
export const keptSelectionKey = new PluginKey('keptSelection')

export const KeptSelection = Extension.create({
  name: 'keptSelection',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: keptSelectionKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, value) {
            const meta = tr.getMeta(keptSelectionKey)
            if (meta === null) return DecorationSet.empty
            if (meta) {
              const from = Math.max(0, Math.min(meta.from, tr.doc.content.size))
              const to = Math.max(from, Math.min(meta.to, tr.doc.content.size))
              if (to === from) return DecorationSet.empty
              return DecorationSet.create(tr.doc, [
                Decoration.inline(from, to, { class: 'kept-selection' })
              ])
            }
            return value.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return keptSelectionKey.getState(state)
          },
          handleDOMEvents: {
            // Any click in the note cancels it. mousedown fires before the
            // selection moves, so the range is still the one being dismissed.
            mousedown(view) {
              if (!keptSelectionRange(view.state)) return false
              clearKeptSelection(view)
              return false
            }
          }
        }
      })
    ]
  }
})

export function keptSelectionRange(state) {
  const decorations = keptSelectionKey.getState(state)
  if (!decorations) return null
  const found = decorations.find()
  return found.length > 0 ? { from: found[0].from, to: found[0].to } : null
}

function viewOf(editorOrView) {
  if (!editorOrView) return null
  if (editorOrView.view) return editorOrView.isDestroyed ? null : editorOrView.view
  return editorOrView
}

/** Draw `range` (or the live selection) and drop the real one. */
export function keepSelection(editor, range) {
  const view = viewOf(editor)
  if (!view) return null
  const { from, to, empty } = view.state.selection
  const target = range ?? (empty ? keptSelectionRange(view.state) : { from, to })
  if (!target || target.to <= target.from) return null
  const tr = view.state.tr.setMeta(keptSelectionKey, { from: target.from, to: target.to })
  if (!empty) tr.setSelection(Selection.near(tr.doc.resolve(target.to)))
  view.dispatch(tr)
  return target
}

export function clearKeptSelection(editor) {
  const view = viewOf(editor)
  if (!view) return
  view.dispatch(view.state.tr.setMeta(keptSelectionKey, null))
}
