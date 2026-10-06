import { useEffect } from 'react'
import { useStore } from 'react-redux'

import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'
import { getNoteSummary } from '@pear-notes/core/utils.js'

import { attachmentIdentity, sweepPdfThumbs } from '../lib/pdfThumbCache'

// Cleanup, not correctness — a burst of edits must not turn into a burst of sweeps.
const SWEEP_DEBOUNCE_MS = 45 * 1000
const SWEEP_MIN_INTERVAL_MS = 5 * 60 * 1000

/**
 * Keeps the persistent thumbnail store free of entries whose PDF no longer exists — including when
 * the removal happened on a linked device and only arrived here as a sync.
 */
export function usePdfThumbSweep() {
  // Read imperatively rather than with useSelector: this hook lives at the app root, and
  // subscribing it to the note list would re-render everything on every save.
  const store = useStore()

  useEffect(() => {
    let lastSweepAt = 0
    let debounce = null

    // Sweeping a half-hydrated store would delete live thumbnails, so wait until the note list has
    // finished loading and every key has its data. A skipped round is caught by the next trigger.
    const collectIdentities = () => {
      const state = store.getState()
      const notesState = state?.notes
      if (!notesState || notesState.isLoading) return null
      const notes = getNotes(state) || []
      if (notes.length !== (notesState.notesKeys?.length ?? 0)) return null

      const identities = new Set()
      for (const note of notes) {
        if (!note?.value) continue
        for (const pdf of getNoteSummary(note.value).pdfs || []) {
          identities.add(attachmentIdentity(pdf.url))
        }
      }
      return identities
    }

    const sweep = () => {
      const now = Date.now()
      if (now - lastSweepAt < SWEEP_MIN_INTERVAL_MS) return
      const identities = collectIdentities()
      if (!identities) return
      lastSweepAt = now
      sweepPdfThumbs(identities).catch(() => {})
    }

    let lastNotesData = store.getState()?.notes?.notesData
    const unsubscribe = store.subscribe(() => {
      const notesData = store.getState()?.notes?.notesData
      if (notesData === lastNotesData) return
      lastNotesData = notesData
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(sweep, SWEEP_DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      if (debounce) clearTimeout(debounce)
    }
  }, [store])
}
