import test from 'brittle'

import { buildNoteMenu, isEditorNoteAction } from '../src/lib/noteMenu.js'

const tr = (key) => key
const base = {
  t: tr,
  moveFolders: [],
  otherVaults: [],
  pinned: false,
  locked: false,
  canSplit: false,
  canRead: false,
  aiReady: false,
  activityEnabled: false,
  relatedEnabled: false
}
const ids = (menu) => menu.map((item) => item.id).filter(Boolean)

test('basic note menu always allows pin, lock and delete', (t) => {
  t.alike(ids(buildNoteMenu(base)), ['copyNote', 'togglePin', 'toggleLock', 'delete'])
})

test('pin and lock labels follow the note state', (t) => {
  const menu = buildNoteMenu({ ...base, pinned: true, locked: true })
  t.is(menu.find((i) => i.id === 'togglePin').label, 'noteEditor.contextMenu.unpinNote')
  t.is(menu.find((i) => i.id === 'toggleLock').label, 'noteEditor.contextMenu.removeLock')
})

test('a locked note hides every action that reads its content', (t) => {
  const open = {
    ...base,
    canRead: true,
    canSplit: true,
    aiReady: true,
    relatedEnabled: true,
    activityEnabled: true
  }
  const unlocked = buildNoteMenu(open)
  t.ok(ids(unlocked).includes('readAloud'))
  t.ok(ids(unlocked).includes('splitNote'))
  t.ok(ids(unlocked).includes('related'))
  t.ok(unlocked.some((i) => i.label === 'noteEditor.contextMenu.restructureAs'))

  const locked = buildNoteMenu({ ...open, locked: true })
  t.absent(ids(locked).includes('readAloud'))
  t.absent(ids(locked).includes('splitNote'))
  t.absent(ids(locked).includes('related'))
  t.absent(locked.some((i) => i.label === 'noteEditor.contextMenu.restructureAs'))
  t.ok(ids(locked).includes('history'), 'history does not expose content')
})

test('reading aloud can be stopped', (t) => {
  const menu = buildNoteMenu({ ...base, canRead: true, reading: true })
  t.ok(ids(menu).includes('stopReading'))
  t.absent(ids(menu).includes('readAloud'))
})

test('move menu lists folders, or says there are none', (t) => {
  const withFolders = buildNoteMenu({ ...base, moveFolders: [{ id: 'f1', name: 'Work' }] })
  t.alike(withFolders[0].submenu, [{ id: 'move:f1', label: 'Work' }])
  const none = buildNoteMenu(base)
  t.is(none[0].submenu[0].enabled, false)
})

test('moving to another vault only shows with other vaults', (t) => {
  t.absent(buildNoteMenu(base).some((i) => i.label === 'vaults.move.menu'))
  const menu = buildNoteMenu({ ...base, otherVaults: [{ id: 'v', name: 'Home' }] })
  t.ok(menu.some((i) => i.label === 'vaults.move.menu'))
})

test('editor actions are recognised', (t) => {
  t.ok(isEditorNoteAction('copyNote'))
  t.ok(isEditorNoteAction('generate:flashcards'))
  t.absent(isEditorNoteAction('delete'))
})
