import test from 'brittle'

import { buildAiTools } from '../src/lib/localAi/aiTools.js'

test('selecting text offers editing tools, otherwise only whole-note tools', (t) => {
  const selection = buildAiTools({ hasSelection: true })
  t.ok(selection.every((tool) => tool.scope === 'selection'))
  t.ok(selection.some((tool) => tool.mode === 'fixGrammar'))
  t.absent(selection.some((tool) => tool.mode === 'suggestTitle'))

  const note = buildAiTools({ hasSelection: false })
  t.ok(note.every((tool) => tool.scope === 'note'))
  t.alike(
    note.map((tool) => tool.mode),
    ['ask', 'summarizeNote', 'suggestTitle', 'keyPoints', 'translate']
  )
})

test('tool ids are unique', (t) => {
  for (const hasSelection of [true, false]) {
    const ids = buildAiTools({ hasSelection }).map((tool) => tool.id)
    t.is(new Set(ids).size, ids.length)
  }
})
