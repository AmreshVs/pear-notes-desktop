import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { findTermRanges, parseSearchQuery } from '@pear-notes/core/backend/noteSearch.js'

export const findInNoteKey = new PluginKey('findInNote')

const LEAF_CHAR = '\ufffc'
const EMPTY = { terms: [], matches: [], active: -1, decorations: DecorationSet.empty }

function findMatches(doc, terms) {
  if (!terms.length) return []
  const matches = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const text = node.textBetween(0, node.content.size, undefined, LEAF_CHAR)
    const ranges = findTermRanges(text, terms)
    for (let i = 0; i + 1 < ranges.length; i += 2) {
      matches.push({ from: pos + 1 + ranges[i], to: pos + 1 + ranges[i + 1] })
    }
    return false
  })
  return matches
}

function decorate(doc, matches, active) {
  if (!matches.length) return DecorationSet.empty
  return DecorationSet.create(
    doc,
    matches.map((match, index) =>
      Decoration.inline(match.from, match.to, {
        class: index === active ? 'find-match find-match-active' : 'find-match'
      })
    )
  )
}

function build(doc, terms, active) {
  const matches = findMatches(doc, terms)
  const clamped = matches.length ? Math.min(Math.max(active, 0), matches.length - 1) : -1
  return { terms, matches, active: clamped, decorations: decorate(doc, matches, clamped) }
}

export const FindInNote = Extension.create({
  name: 'findInNote',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findInNoteKey,
        state: {
          init: () => EMPTY,
          apply(tr, value) {
            const meta = tr.getMeta(findInNoteKey)
            if (meta?.clear) return EMPTY
            if (meta?.query !== undefined) return build(tr.doc, parseSearchQuery(meta.query), 0)
            if (meta?.active !== undefined && value.matches.length) {
              const count = value.matches.length
              const active = ((meta.active % count) + count) % count
              return { ...value, active, decorations: decorate(tr.doc, value.matches, active) }
            }
            if (tr.docChanged && value.terms.length) return build(tr.doc, value.terms, value.active)
            return value
          }
        },
        props: {
          decorations(state) {
            return findInNoteKey.getState(state)?.decorations
          }
        }
      })
    ]
  }
})

const viewOf = (editor) => (editor && !editor.isDestroyed ? editor.view : null)

export function getFindState(editor) {
  const view = viewOf(editor)
  const value = view ? findInNoteKey.getState(view.state) : null
  return { count: value?.matches.length || 0, active: value?.active ?? -1 }
}

export function revealFindMatch(editor) {
  const view = viewOf(editor)
  if (view) revealActive(view)
}

function scrollParentOf(element) {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight)
      return node
  }
  return null
}

function revealActive(view) {
  const value = findInNoteKey.getState(view.state)
  const match = value?.matches[value.active]
  if (!match) return
  const scroller = scrollParentOf(view.dom)
  if (!scroller) return
  const matchTop = view.coordsAtPos(match.from).top
  const scrollerTop = scroller.getBoundingClientRect().top
  const top = scroller.scrollTop + matchTop - scrollerTop - scroller.clientHeight / 3
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  scroller.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' })
}

export function setFindQuery(editor, query) {
  const view = viewOf(editor)
  if (!view) return
  view.dispatch(view.state.tr.setMeta(findInNoteKey, { query: query || '' }))
  revealActive(view)
}

export function moveFindMatch(editor, step) {
  const view = viewOf(editor)
  if (!view) return
  const value = findInNoteKey.getState(view.state)
  if (!value?.matches.length) return
  view.dispatch(view.state.tr.setMeta(findInNoteKey, { active: value.active + step }))
  revealActive(view)
}

export function clearFind(editor) {
  const view = viewOf(editor)
  if (!view) return
  if (!findInNoteKey.getState(view.state)?.terms.length) return
  view.dispatch(view.state.tr.setMeta(findInNoteKey, { clear: true }))
}
