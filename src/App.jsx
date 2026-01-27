import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createNote, updateNote, deleteNote, getSelectedNote, getIsLoading as getNotesLoading } from './store/slices/notesSlice'
import {
  setSelectedFolder,
  getFolders,
  createFolder,
  deleteFolder,
  getSelectedFolder
} from './store/slices/foldersSlice'
import {
  setSearchQuery,
  setShowSettings,
  setShowNewFolderModal,
  setEditor,
  appReady,
  getSearchQuery,
  getShowSettings,
  getShowNewFolderModal
} from './store/slices/uiSlice'
import {
  checkAndInsertLocalDevice,
  subscribeSyncedDevices
} from './store/slices/syncedDevicesSlice'


import TitleBar from './ui/TitleBar'
import FoldersSidebar from './ui/FoldersSidebar'
import NotesList from './ui/NotesList'
import NoteEditor from './ui/NoteEditor'
import ResizablePanel from './ui/ResizablePanel'
import SettingsScreen from './ui/SettingsScreen'
import NewFolderModal from './ui/NewFolderModal'
import PairingStatusOverlay from './ui/PairingStatusOverlay'
import { backendApi } from './backend/api'
import { debounce } from './utils'

function App() {
  const dispatch = useDispatch()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)

  const selectedNote = useSelector(getSelectedNote)
  const isLoading = useSelector(getNotesLoading)
  const selectedFolder = useSelector(getSelectedFolder)
  const searchQuery = useSelector(getSearchQuery)
  const showSettings = useSelector(getShowSettings)
  const showNewFolderModal = useSelector(getShowNewFolderModal)
  const folders = useSelector(getFolders)

  useEffect(() => {
    const load = async () => {
      await backendApi.ready()
      dispatch(appReady())
      dispatch(checkAndInsertLocalDevice())
      dispatch(subscribeSyncedDevices())
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
    }, 500),
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

  if (isLoading) {
    return (
      <main className='h-screen flex flex-col bg-bg-primary overflow-hidden'>
        <TitleBar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3 border-accent-primary'></div>
            <p className='text-[15px] text-text-tertiary'>
              Loading...
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className='h-screen flex flex-col bg-bg-primary overflow-hidden relative'>
      <div className='absolute -top-32 -left-32 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />
      <div className='absolute -bottom-32 -right-32 w-96 h-96 bg-accent-primary/5 blur-[120px] rounded-full pointer-events-none' />

      <TitleBar />
      <div className='flex-1 flex overflow-hidden relative z-10'>
        { !isSidebarCollapsed && (
          <ResizablePanel defaultWidth={260} minWidth={260} maxWidth={400}>
            <FoldersSidebar
              selectedFolder={selectedFolder}
              onSelectFolder={(folder) => dispatch(setSelectedFolder(folder))}
              folders={folders}
              onCreateNote={handleCreateNote}
              onCreateFolder={() => dispatch(setShowNewFolderModal(true))}
              onDeleteFolder={handleDeleteFolder}
              onSettingsClick={() => dispatch(setShowSettings(true))}
              onToggleCollapse={() => setIsSidebarCollapsed(true)}
            />
          </ResizablePanel>
        )}

        <ResizablePanel defaultWidth={340} minWidth={320} maxWidth={500}>
          <NotesList 
            selectedFolder={selectedFolder} 
            searchQuery={searchQuery}
            onSearchChange={(value) => dispatch(setSearchQuery(value))}
            onCreateNote={handleCreateNote}
            onCreateFolder={() => dispatch(setShowNewFolderModal(true))}
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

      {showSettings && <SettingsScreen onClose={() => dispatch(setShowSettings(false))} />}
      {showNewFolderModal && (
        <NewFolderModal
          onClose={() => dispatch(setShowNewFolderModal(false))}
          onCreateFolder={handleCreateFolder}
        />
      )}
      <PairingStatusOverlay />
    </main>
  )
}

export default App
