import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'

const DB_NAME = 'pear-notes-pdf-thumbs'
const DB_VERSION = 1
const STORE_NAME = 'thumbs'

// An entry written moments ago may belong to an attachment whose note has not reached the store
// yet, so young entries are never swept.
const SWEEP_GRACE_MS = 5 * 60 * 1000

let dbPromise = null

// A thumbnail is usually written while a note is open, long after the sidebar row read the cache
// and found nothing. Without this the row stays blank until the next app start.
const writeListeners = new Set()

export function subscribePdfThumbWrites(listener) {
  writeListeners.add(listener)
  return () => {
    writeListeners.delete(listener)
  }
}

// The blob server's port changes between runs, so the port-bearing form of an attachment URL is
// useless as a cache identity. Anything carrying a `blob=` query is folded back to the stable
// hyperdrive form, which is what the note HTML stores.
export function attachmentIdentity(url) {
  if (!url) return ''
  const queryIndex = url.indexOf('?')
  if (queryIndex !== -1 && url.slice(queryIndex).includes('blob=')) {
    return `${HYPERDRIVE_URL_PREFIX}/${url.slice(queryIndex)}`
  }
  return url
}

function open(version) {
  return new Promise((resolve) => {
    let request
    try {
      request = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = (async () => {
    const db = await open(DB_VERSION)
    if (!db || db.objectStoreNames.contains(STORE_NAME)) return db
    // The database exists at this version but without our store — every read and write would
    // silently fail forever. Reopening one version higher runs the upgrade that creates it.
    const version = db.version + 1
    db.close()
    const upgraded = await open(version)
    return upgraded && upgraded.objectStoreNames.contains(STORE_NAME) ? upgraded : null
  })()
  return dbPromise
}

function runTransaction(mode, work) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) {
          resolve(null)
          return
        }
        let transaction
        try {
          transaction = db.transaction(STORE_NAME, mode)
        } catch {
          resolve(null)
          return
        }
        const store = transaction.objectStore(STORE_NAME)
        let result = null
        try {
          result = work(store, (value) => {
            result = value
          })
        } catch {
          resolve(null)
          return
        }
        transaction.oncomplete = () => resolve(result)
        transaction.onerror = () => resolve(null)
        transaction.onabort = () => resolve(null)
      })
  )
}

export function getCachedPdfThumb(url) {
  const identity = attachmentIdentity(url)
  if (!identity) return Promise.resolve(null)
  return runTransaction('readonly', (store, setResult) => {
    const request = store.get(identity)
    request.onsuccess = () => setResult(request.result || null)
    return null
  })
}

export function putPdfThumb(url, thumb) {
  const identity = attachmentIdentity(url)
  if (!identity || !thumb?.dataUrl) return Promise.resolve(null)
  return runTransaction('readwrite', (store) => {
    store.put(
      { dataUrl: thumb.dataUrl, pageCount: thumb.pageCount || 0, savedAt: Date.now() },
      identity
    )
    return null
  }).then((result) => {
    for (const listener of [...writeListeners]) listener(identity)
    return result
  })
}

export function deletePdfThumb(url) {
  const identity = attachmentIdentity(url)
  if (!identity) return Promise.resolve(null)
  return runTransaction('readwrite', (store) => {
    store.delete(identity)
    return null
  })
}

/**
 * Drops every thumbnail whose attachment is no longer referenced by a note. These are what the
 * sidebar draws, so they must not expire on a timer — one lives exactly as long as its attachment,
 * and this is what reclaims the space when a *linked device* removes the PDF.
 */
export function sweepPdfThumbs(liveIdentities, lockedIdentities = new Set()) {
  return runTransaction('readwrite', (store) => {
    const cutoff = Date.now() - SWEEP_GRACE_MS
    const request = store.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      const savedAt = cursor.value?.savedAt || 0
      const expired = lockedIdentities.has(cursor.key) || savedAt <= cutoff
      if (!liveIdentities.has(cursor.key) && expired) cursor.delete()
      cursor.continue()
    }
    return null
  })
}
