// Undo history is per note, but the Tiptap instance and its history plugin are not:
// loading a note is a programmatic setContent that lands in the undo stack, so the
// first undo in a freshly opened note would replay the previous note's document.
// prosemirror-history has no clear command; it does adopt a `historyState` handed to
// it on its own plugin key, and a freshly initialised one is empty. The transaction
// carries no steps, so the document is untouched and `onUpdate` never fires.
export function clearEditorHistory(editor) {
  if (!editor || editor.isDestroyed) return

  const { state, view } = editor
  const historyPlugin = state.plugins.find(
    (plugin) => typeof plugin.key === 'string' && plugin.key.startsWith('history$')
  )
  if (!historyPlugin?.spec?.state?.init) return

  view.dispatch(
    state.tr.setMeta(historyPlugin, { historyState: historyPlugin.spec.state.init({}, state) })
  )
}
