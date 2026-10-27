import test from 'brittle'

import { clearEditorHistory } from '../src/lib/editorHistory.js'

const historyPlugin = { key: 'history$1', spec: { state: { init: () => 'empty' } } }

function fakeEditor(plugins) {
  const dispatched = []
  const tr = { setMeta: (plugin, meta) => ({ plugin, meta }) }
  return {
    dispatched,
    isDestroyed: false,
    state: { plugins, tr },
    view: { dispatch: (transaction) => dispatched.push(transaction) }
  }
}

test('opening a note starts with an empty undo history', (t) => {
  const editor = fakeEditor([{ key: 'other$1' }, historyPlugin])
  clearEditorHistory(editor)
  t.is(editor.dispatched.length, 1)
  t.is(editor.dispatched[0].plugin, historyPlugin)
  t.alike(editor.dispatched[0].meta, { historyState: 'empty' })
})

test('nothing happens without a live editor or a history plugin', (t) => {
  const editor = fakeEditor([{ key: 'other$1' }])
  clearEditorHistory(editor)
  t.is(editor.dispatched.length, 0)
  clearEditorHistory(null)
  const destroyed = fakeEditor([historyPlugin])
  destroyed.isDestroyed = true
  clearEditorHistory(destroyed)
  t.is(destroyed.dispatched.length, 0)
})
