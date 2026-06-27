import { useEffect, useState, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createNote, updateNote, deleteNote, getSelectedNote, getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  setSelectedFolder,
  getFolders,
  createFolder,
  deleteFolder,
  getSelectedFolder
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  setSearchQuery,
  setShowSettings,
  setEditor,
  appReady,
  getSearchQuery,
  getShowSettings
} from '@pear-notes/core/store/slices/uiSlice.js'

import TitleBar from './ui/TitleBar'
import FoldersSidebar from './ui/FoldersSidebar'
import NotesList from './ui/NotesList'
import NoteEditor from './ui/NoteEditor'
import ResizablePanel from './ui/ResizablePanel'
import SettingsScreen from './ui/SettingsScreen'
import PairingStatusOverlay from './ui/PairingStatusOverlay'
import DeviceRemovedModal from './ui/DeviceRemovedModal'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { debounce } from '@pear-notes/core/utils.js'
import { useWindowSize } from './hooks/useWindowSize'
import { getDbEncryptionKey } from './utils.js'


function App() {
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

  const selectedNote = useSelector(getSelectedNote)
  const isLoading = useSelector(getNotesLoading)
  const selectedFolder = useSelector(getSelectedFolder)
  const searchQuery = useSelector(getSearchQuery)
  const showSettings = useSelector(getShowSettings)
  const folders = useSelector(getFolders)

  useEffect(() => {
    const load = async () => {
      const key = getDbEncryptionKey()
      const storagePath = window.electronBridge.getStoragePath()
      await backendApi.ready({ storage: storagePath, encryption: key })
      dispatch(appReady())
    }

    load()
  }, [dispatch])

  const handleCreateNote = () => {
    const newNote = {
      title: '',
      note: ''
    }

    dispatch(createNote(newNote))
    dispatch(setSearchQuery(''))
  }

  const debouncedUpdateNote = useMemo(
    () => debounce(({ key, title, contentHtml }) => {
      dispatch(updateNote({ key, title, note: contentHtml }))
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
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3 border-accent-primary'></div>
        <p className='text-[15px] text-text-tertiary'>
          Loading...
        </p>
      </div>
    </div>
  ) : (
    <div className='flex-1 flex overflow-hidden relative z-10'>
      <ResizablePanel 
        defaultWidth={260} 
        minWidth={260} 
        maxWidth={400} 
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

      <ResizablePanel defaultWidth={340} minWidth={320} maxWidth={500}>
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
    <main className='h-screen flex flex-col bg-bg-primary overflow-hidden relative'>
      <div className='absolute -top-32 -left-32 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />
      <div className='absolute -bottom-32 -right-32 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />

      <TitleBar />
      {content}
      {showSettings && <SettingsScreen onClose={() => dispatch(setShowSettings(false))} />}
      <PairingStatusOverlay />
      <DeviceRemovedModal />
    </main>
  )
}

export default App
