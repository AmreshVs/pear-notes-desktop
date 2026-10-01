const fs = require('fs')
const path = require('path')

const CHROMIUM_CATEGORY = {
  Cache: 'cache',
  IndexedDB: 'previews'
}

let helpersPromise = null

function loadHelpers() {
  if (!helpersPromise) helpersPromise = import('@pear-notes/core/store/services/deviceStorage.js')
  return helpersPromise
}

async function entryBytes(target) {
  let stat
  try {
    stat = await fs.promises.lstat(target)
  } catch {
    return 0
  }
  if (stat.isSymbolicLink()) return 0
  if (!stat.isDirectory()) return stat.blocks ? stat.blocks * 512 : stat.size
  let names = []
  try {
    names = await fs.promises.readdir(target)
  } catch {
    return 0
  }
  let total = 0
  for (const name of names) total += await entryBytes(path.join(target, name))
  return total
}

async function children(dir) {
  try {
    return await fs.promises.readdir(dir)
  } catch {
    return []
  }
}

function appBundlePath() {
  const exe = process.execPath
  return process.platform === 'darwin' ? path.resolve(exe, '..', '..', '..') : path.dirname(exe)
}

async function measureDeviceStorage({ storagePath, aiRoot, userData }) {
  const { DEVICE_STORAGE, classifyVaultStorageEntry, summarizeDeviceStorage } = await loadHelpers()
  const items = [{ category: DEVICE_STORAGE.APP, bytes: await entryBytes(appBundlePath()) }]
  const seen = new Set()

  const addDir = async (dir, classify) => {
    if (!dir || seen.has(dir)) return
    seen.add(dir)
    for (const name of await children(dir)) {
      const bytes = await entryBytes(path.join(dir, name))
      items.push({ category: classify(name) ?? DEVICE_STORAGE.OTHER, bytes })
    }
  }

  await addDir(storagePath, (name) => classifyVaultStorageEntry(name) ?? CHROMIUM_CATEGORY[name])
  if (aiRoot && !seen.has(aiRoot)) {
    seen.add(aiRoot)
    items.push({ category: DEVICE_STORAGE.AI_MODELS, bytes: await entryBytes(aiRoot) })
  }
  await addDir(userData, (name) => CHROMIUM_CATEGORY[name])
  return summarizeDeviceStorage(items)
}

async function deleteOldVaults(storagePath) {
  const { isOldVaultEntry } = await loadHelpers()
  for (const name of await children(storagePath)) {
    if (!isOldVaultEntry(name)) continue
    await fs.promises.rm(path.join(storagePath, name), { recursive: true, force: true })
  }
}

module.exports = { measureDeviceStorage, deleteOldVaults }
