import test from 'brittle'

import { DEVICE_STORAGE } from '@pear-notes/core/store/services/deviceStorage.js'

import { getVaultUsage, getDeviceStorageBreakdown } from '../src/lib/storageBreakdown.js'

test('open vault is listed first, then the biggest', (t) => {
  const usage = getVaultUsage(
    [
      { id: 'a', current: false },
      { id: 'b', current: true },
      { id: 'c', current: false }
    ],
    {
      a: 10,
      b: 5,
      c: 50
    }
  )
  t.alike(
    usage.map((v) => v.id),
    ['b', 'c', 'a']
  )
  t.is(getVaultUsage([{ id: 'x' }], undefined)[0].bytes, 0)
})

test('app size excludes vault data and AI models get their own bar', (t) => {
  const usage = getVaultUsage([{ id: 'a', current: true }], { a: 600 })
  const summary = {
    byCategory: {
      [DEVICE_STORAGE.NOTES]: 600,
      [DEVICE_STORAGE.APP]: 300,
      [DEVICE_STORAGE.CACHE]: 100,
      [DEVICE_STORAGE.AI_MODELS]: 1000
    }
  }
  const result = getDeviceStorageBreakdown(summary, usage, false)
  t.is(result.appBytes, 400)
  t.is(result.aiBytes, 1000)
  t.is(result.cacheBytes, 100)
  t.is(result.dataBytes, 100)
  t.is(result.showAi, true)
  t.alike(
    result.segments.map((s) => s.tone),
    ['openVault', 'ai', 'app']
  )
})

test('empty storage has no segments and hides AI until models exist', (t) => {
  const result = getDeviceStorageBreakdown(null, [], false)
  t.alike(result.segments, [])
  t.is(result.showAi, false)
  t.is(getDeviceStorageBreakdown(null, [], true).showAi, true)
})

test('tiny segments stay visible', (t) => {
  const usage = getVaultUsage([{ id: 'a', current: true }], { a: 1 })
  const result = getDeviceStorageBreakdown(
    { byCategory: { [DEVICE_STORAGE.NOTES]: 1, [DEVICE_STORAGE.AI_MODELS]: 1_000_000 } },
    usage,
    false
  )
  t.ok(result.segments.every((s) => s.share >= 0.015))
})
