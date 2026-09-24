import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { backendApi, setLocalDeviceName } from '@pear-notes/core/backend/api.js'
import { appBoot } from '@pear-notes/core/bootTimeline.js'
import {
  createFolder,
  deleteFolder,
  getFolders,
  getSelectedFolder,
  setSelectedFolder
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  createNote,
  deleteNote,
  getIsLoading as getNotesLoading,
  getSelectedNote,
  updateNote
} from '@pear-notes/core/store/slices/notesSlice.js'
import { getHasLinkedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getReceiverStatus } from '@pear-notes/core/store/slices/syncSlice.js'
import {
  appReady,
  getSearchQuery,
  getShowSettings,
  setEditor,
  setSearchQuery,
  setShowSettings
} from '@pear-notes/core/store/slices/uiSlice.js'
import { debounce } from '@pear-notes/core/utils.js'

import appIcon from '../build/icon.png'

import BackupProgressBanner from './components/common/BackupProgressBanner'
import NoteLockPasswordProvider from './components/common/NoteLockPasswordProvider'
import PairingStatusOverlay from './components/common/PairingStatusOverlay'
import TitleBar from './components/common/TitleBar'
import UpdateAvailableBanner from './components/common/UpdateAvailableBanner'
import NoteEditor from './components/editor/NoteEditor'
import DeviceRemovedModal from './components/modals/DeviceRemovedModal'
import UpdateRequiredModal from './components/modals/UpdateRequiredModal'
import SettingsScreen from './components/settings/SettingsScreen'
import FoldersSidebar from './components/sidebar/FoldersSidebar'
import NotesList from './components/sidebar/NotesList'
import ResizablePanel from './components/sidebar/ResizablePanel'
import { useAppReload } from './hooks/useAppReload'
import { usePdfThumbSweep } from './hooks/usePdfThumbSweep'
import { usePowerState } from './hooks/usePowerState'
import { useWindowSize } from './hooks/useWindowSize'
import {
  applyCloseToTray,
  applyStartAtLogin,
  CLOSE_TO_TRAY_KEY,
  getAppBehaviorPreference,
  START_AT_LOGIN_KEY
} from './lib/appBehavior'
import { useAppUpdateStatus } from './lib/appUpdateCheck'
import { useLocalAiBridge } from './lib/localAi/useLocalAiBridge'
import { getDbEncryptionKey, getVaultEntropy, setDbEncryptionKey } from './utils.js'

function App() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { width } = useWindowSize()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(width < 1000)
  const prevWidth = useRef(width)

  useEffect(() => {
    if (width < 1000 && prevWidth.current >= 1000) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSidebarCollapsed(true)
    }
    prevWidth.current = width
  }, [width])

  useAppReload()
  usePdfThumbSweep()
  usePowerState()
  useLocalAiBridge()

  const selectedNote = useSelector(getSelectedNote)
  const isLoading = useSelector(getNotesLoading)
  const selectedFolder = useSelector(getSelectedFolder)
  const searchQuery = useSelector(getSearchQuery)
  const showSettings = useSelector(getShowSettings)
  const folders = useSelector(getFolders)
  const updateStatus = useAppUpdateStatus()

  useEffect(() => {
    const load = async () => {
      appBoot.mark('renderer reached backendApi.ready')
      const key = getDbEncryptionKey()
      const storagePath = window.electronBridge.getStoragePath()
      if (!key) {
        window.electronBridge.showFatalError(t('error.startFailedTitle'), t('error.startFailed'))
        return
      }

      // A vault whose key is sealed and whose entropy is gone must stop here
      // with an explanation. Carrying on would open an empty vault, which is
      // indistinguishable from having lost every note.
      const openVault = () =>
        backendApi.ready({
          storage: storagePath,
          encryption: key,
          entropy: getVaultEntropy()
        })
      let result = await openVault()
      let startedFresh = false

      // LEGACY(hyperdb-migration): see docs/HYPERDB-VIEW-MIGRATION-PLAN-2026-09-23.md section 8
      if (result?.done !== true && result?.reason === 'LEGACY_VAULT') {
        const choice = await window.electronBridge.askLegacyVault({
          title: t('error.legacyVaultTitle'),
          message: t('error.legacyVault'),
          quitLabel: t('error.legacyVaultQuit'),
          startFreshLabel: t('error.legacyVaultStartFresh')
        })
        if (choice !== 'start-fresh') return
        const fresh = await backendApi.startFreshVault({ storage: storagePath })
        if (fresh?.done !== true) {
          window.electronBridge.showFatalError(
            t('error.startFailedTitle'),
            t('error.legacyVaultStartFreshFailed')
          )
          return
        }
        result = await openVault()
        startedFresh = true
      }

      if (result?.done !== true) {
        const sealed = result?.reason === 'VAULT_KEY_SEALED'
        window.electronBridge.showFatalError(
          t(sealed ? 'error.vaultSealedTitle' : 'error.startFailedTitle'),
          t(sealed ? 'error.vaultSealed' : 'error.startFailed')
        )
        return
      }

      appBoot.mark('backendApi.ready resolved')
      dispatch(appReady())
      setLocalDeviceName(window.electronBridge.getDeviceName())
      if (startedFresh) dispatch(setShowSettings('backup'))
    }

    load()
  }, [dispatch, t])

  const hasLinkedDevices = useSelector(getHasLinkedDevices)
  const pairedEncryptionKey = useSelector(getReceiverStatus)?.encryptionKey
  const savedEncryptionKeyRef = useRef(null)

  useEffect(() => {
    if (!pairedEncryptionKey || pairedEncryptionKey === savedEncryptionKeyRef.current) return
    savedEncryptionKeyRef.current = pairedEncryptionKey
    setDbEncryptionKey(pairedEncryptionKey)
  }, [pairedEncryptionKey])

  useEffect(() => {
    const syncAppBehavior = async () => {
      const [closeToTray, startAtLogin] = await Promise.all([
        getAppBehaviorPreference(CLOSE_TO_TRAY_KEY, true),
        getAppBehaviorPreference(START_AT_LOGIN_KEY, false)
      ])
      applyCloseToTray(closeToTray && hasLinkedDevices)
      applyStartAtLogin(startAtLogin)
    }

    syncAppBehavior()
  }, [hasLinkedDevices])

  const handleCreateNote = () => {
    const newNote = {
      title: '',
      note: ''
    }

    dispatch(createNote(newNote))
    dispatch(setSearchQuery(''))
  }

  const debouncedUpdateNote = useMemo(
    () =>
      debounce(({ key, title, contentHtml }) => {
        dispatch(updateNote({ key, title, note: contentHtml, fromEditor: true }))
      }, 100),
    [dispatch]
  )

  const handleUpdateNote = (data) => {
    debouncedUpdateNote(data)
  }

  const handleDeleteNote = async (key) => {
    dispatch(deleteNote(key))
  }

  const handleEditorReady = (editorInstance) => {
    dispatch(setEditor(editorInstance))
  }

  const handleCreateFolder = (name) => {
    dispatch(createFolder({ name }))
  }

  const handleDeleteFolder = (key) => {
    dispatch(deleteFolder(key))
  }

  const content = isLoading ? (
    <div className='flex-1 flex items-center justify-center'>
      <div className='text-center'>
        <img
          src={appIcon}
          alt=''
          className='h-16 w-16 mx-auto mb-4 shadow-lg select-none'
          draggable={false}
        />
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3 border-accent-primary'></div>
        <p className='text-base text-text-tertiary'>{t('common.loading')}</p>
      </div>
    </div>
  ) : (
    <div className='flex-1 flex overflow-hidden relative z-10'>
      <ResizablePanel
        storageKey='folders'
        defaultWidth={280}
        minWidth={240}
        maxWidth={420}
        collapsed={isSidebarCollapsed}
        collapsedWidth={0}
      >
        <FoldersSidebar
          selectedFolder={selectedFolder}
          onSelectFolder={(folder) => dispatch(setSelectedFolder(folder))}
          folders={folders}
          onCreateNote={handleCreateNote}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onSettingsClick={() => dispatch(setShowSettings(true))}
          onToggleCollapse={() => setIsSidebarCollapsed(true)}
        />
      </ResizablePanel>

      <ResizablePanel storageKey='notesList' defaultWidth={380} minWidth={320} maxWidth={560}>
        <NotesList
          selectedFolder={selectedFolder}
          searchQuery={searchQuery}
          onSearchChange={(value) => dispatch(setSearchQuery(value))}
          onCreateNote={handleCreateNote}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
      </ResizablePanel>

      <NoteEditor
        key={selectedNote}
        onUpdate={handleUpdateNote}
        onDelete={handleDeleteNote}
        onEditorReady={handleEditorReady}
      />
    </div>
  )

  return (
    <NoteLockPasswordProvider>
      <main className='h-screen flex flex-col bg-bg-primary overflow-hidden relative'>
        <div className='absolute -top-32 -left-32 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />
        <div className='absolute -bottom-32 -right-32 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />

        <div className='contents' inert={showSettings}>
          <TitleBar />
          {content}
        </div>
        {showSettings && (
          <SettingsScreen
            initialSection={typeof showSettings === 'string' ? showSettings : 'general'}
            onClose={() => dispatch(setShowSettings(false))}
          />
        )}
        <PairingStatusOverlay />
        <DeviceRemovedModal />
        <BackupProgressBanner />
        {updateStatus?.mandatory && (
          <UpdateRequiredModal
            latestVersion={updateStatus.latestVersion}
            downloadUrl={updateStatus.downloadUrl}
          />
        )}
        {!updateStatus?.mandatory && updateStatus?.updateAvailable && (
          <UpdateAvailableBanner
            latestVersion={updateStatus.latestVersion}
            downloadUrl={updateStatus.downloadUrl}
          />
        )}
      </main>
    </NoteLockPasswordProvider>
  )
}

export default App
