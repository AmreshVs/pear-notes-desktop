import { NOTE_TASK, TEMPLATE_TASKS } from '@pear-notes/core/store/services/localAiPrompts.js'

import { getVaultMenuItems } from './vaultNames'

export const MOVE_MENU_PREFIX = 'move:'
export const GENERATE_MENU_PREFIX = 'generate:'

export const EDITOR_NOTE_ACTIONS = new Set(['copyNote', 'readAloud', 'splitNote', 'related'])

export function isEditorNoteAction(action) {
  return EDITOR_NOTE_ACTIONS.has(action) || action.startsWith(GENERATE_MENU_PREFIX)
}

const generateItems = (tasks, t) =>
  tasks.map((task) => ({
    id: `${GENERATE_MENU_PREFIX}${task}`,
    label: t(`generate.actions.${task}`)
  }))

export function buildNoteMenu({
  t,
  moveFolders,
  otherVaults,
  pinned,
  locked,
  canCopy = true,
  canSplit,
  canRead,
  reading,
  aiReady,
  activityEnabled,
  relatedEnabled
}) {
  const moveSubmenu =
    moveFolders.length > 0
      ? moveFolders.map((f) => ({ id: `${MOVE_MENU_PREFIX}${f.id}`, label: f.name }))
      : [{ label: t('noteEditor.contextMenu.noOtherLists'), enabled: false }]
  const contentOpen = !locked

  return [
    { label: t('noteEditor.contextMenu.moveTo'), submenu: moveSubmenu },
    ...(otherVaults.length > 0
      ? [{ label: t('vaults.move.menu'), submenu: getVaultMenuItems(otherVaults, t) }]
      : []),
    ...(canCopy ? [{ id: 'copyNote', label: t('noteEditor.contextMenu.copyNote') }] : []),
    ...(canRead && contentOpen
      ? [
          reading
            ? { id: 'stopReading', label: t('noteEditor.contextMenu.stopReading') }
            : { id: 'readAloud', label: t('noteEditor.contextMenu.readAloud') }
        ]
      : []),
    ...(canSplit && contentOpen
      ? [{ id: 'splitNote', label: t('noteEditor.contextMenu.splitNote') }]
      : []),
    ...(aiReady && contentOpen
      ? [
          {
            label: t('noteEditor.contextMenu.restructureAs'),
            submenu: generateItems(TEMPLATE_TASKS, t)
          },
          {
            label: t('noteEditor.contextMenu.createFromNote'),
            submenu: generateItems([NOTE_TASK.FLASHCARDS, NOTE_TASK.ACTION_LIST], t)
          }
        ]
      : []),
    ...(activityEnabled ? [{ id: 'history', label: t('noteEditor.contextMenu.noteHistory') }] : []),
    ...(relatedEnabled && contentOpen
      ? [{ id: 'related', label: t('noteEditor.contextMenu.relatedNotes') }]
      : []),
    {
      id: 'togglePin',
      label: pinned ? t('noteEditor.contextMenu.unpinNote') : t('noteEditor.contextMenu.pinNote')
    },
    {
      id: 'toggleLock',
      label: locked ? t('noteEditor.contextMenu.removeLock') : t('noteEditor.contextMenu.lockNote')
    },
    { type: 'separator' },
    { id: 'delete', label: t('noteEditor.contextMenu.delete') }
  ]
}
