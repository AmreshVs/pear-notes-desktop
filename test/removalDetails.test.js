import test from 'brittle'

import { buildRemoveAllDetails, buildClearVaultDetails } from '../src/lib/removalDetails.js'

const t = (key, options) => (options ? `${key}${JSON.stringify(options)}` : key)

test('remove everything lists vaults and data, and AI models only when present', (t2) => {
  const base = { vaultNames: ['Home', 'Work'], vaultBytes: 0, aiBytes: 0, dataBytes: 0 }
  const without = buildRemoveAllDetails(t, { ...base, showAi: false })
  t2.alike(
    without.removed.map((r) => r.key),
    ['vaults', 'data']
  )
  const withAi = buildRemoveAllDetails(t, { ...base, showAi: true })
  t2.alike(
    withAi.removed.map((r) => r.key),
    ['vaults', 'ai', 'data']
  )
  t2.alike(
    withAi.kept.map((k) => k.key),
    ['devices', 'backups']
  )
})

test('clearing the only vault is the same as removing everything', (t2) => {
  const details = buildClearVaultDetails(t, {
    vaultName: 'Home',
    notes: 3,
    folders: 1,
    mediaBytes: 0,
    otherVaultNames: []
  })
  t2.is(details.title, 'storage.removal.allTitleComputer')
  t2.is(details.note, 'storage.removal.cantUndoFresh')
})

test('clearing one of several vaults names the vault and what is kept', (t2) => {
  const details = buildClearVaultDetails(t, {
    vaultName: 'Home',
    notes: 3,
    folders: 1,
    mediaBytes: 2048,
    otherVaultNames: ['Work', 'Ideas']
  })
  t2.ok(details.title.includes('Home'))
  t2.is(details.kept[1].label, 'Work, Ideas')
  t2.is(details.note, 'storage.removal.cantUndo')
})
