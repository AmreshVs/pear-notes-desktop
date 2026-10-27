import test from 'brittle'

import { VAULT_ERROR } from '@pear-notes/core/constant.js'

import { getVaultLabel, getVaultErrorText } from '../src/lib/vaultNames.js'

const key = (k) => k

test('unnamed vault shows the default name', (t) => {
  t.is(getVaultLabel({ name: 'Work' }, key), 'Work')
  t.is(getVaultLabel({ name: '' }, key), 'vaults.defaultName')
})

test('vault errors show their message and unknown ones a generic one', (t) => {
  t.is(getVaultErrorText(VAULT_ERROR.LAST_VAULT, key), 'vaults.errors.lastVault')
  t.is(getVaultErrorText('something-new', key), 'vaults.errors.openFailed')
  t.is(getVaultErrorText(null, key), '')
})
