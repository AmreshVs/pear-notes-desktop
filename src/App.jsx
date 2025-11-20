import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createNote, updateNote, deleteNote } from './store/notesSlice'
import {
  setSelectedFolder,
  setSearchQuery,
  setShowSettings,
  setShowNewFolderModal,
  setEditor,
  toggleTheme,
  createFolder,
  appReady
} from './store/uiSlice'
import TitleBar from './ui/TitleBar'
import FoldersSidebar from './ui/FoldersSidebar'
import NotesList from './ui/NotesList'
import NoteEditor from './ui/NoteEditor'
import Toolbar from './ui/Toolbar'
import ResizablePanel from './ui/ResizablePanel'
import SettingsScreen from './ui/SettingsScreen'
import NewFolderModal from './ui/NewFolderModal'
import { backendApi } from './backend/api'

function App() {
  const dispatch = useDispatch()

  const notes = useSelector((state) => state.notes.notes)
  const selectedNote = useSelector((state) => state.notes.selectedNote)
  const isLoading = useSelector((state) => state.notes.isLoading)
  const selectedFolder = useSelector((state) => state.ui.selectedFolder)
  const searchQuery = useSelector((state) => state.ui.searchQuery)
  const showSettings = useSelector((state) => state.ui.showSettings)
  const showNewFolderModal = useSelector((state) => state.ui.showNewFolderModal)
  const folders = useSelector((state) => state.ui.folders)
  const theme = useSelector((state) => state.ui.theme)

  useEffect(() => {
    const load = async () => {
      await backendApi.ready()
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

  const handleUpdateNote = ({ key, title, contentHtml }) => {
    dispatch(updateNote({ key, title, note: contentHtml }))
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

  if (isLoading) {
    return (
      <main className='min-h-screen flex flex-col bg-bg-primary'>
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
    <main className='min-h-screen flex flex-col bg-bg-primary'>
      <TitleBar />
      <div className='flex-1 flex flex-col overflow-hidden'>
        <Toolbar
          searchQuery={searchQuery}
          onSearchChange={(value) => dispatch(setSearchQuery(value))}
        />

        <div className='flex-1 flex overflow-hidden'>
          <ResizablePanel defaultWidth={240} minWidth={180} maxWidth={400}>
            <FoldersSidebar
              selectedFolder={selectedFolder}
              onSelectFolder={(folder) => dispatch(setSelectedFolder(folder))}
              notes={notes}
              folders={folders}
              onCreateNote={handleCreateNote}
              onCreateFolder={() => dispatch(setShowNewFolderModal(true))}
              onSettingsClick={() => dispatch(setShowSettings(true))}
              onThemeToggle={() => dispatch(toggleTheme())}
              theme={theme}
            />
          </ResizablePanel>

          <ResizablePanel defaultWidth={280} minWidth={200} maxWidth={500}>
            <NotesList selectedFolder={selectedFolder} />
          </ResizablePanel>

          <NoteEditor
            key={selectedNote}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            onEditorReady={handleEditorReady}
          />
        </div>
      </div>

      {showSettings && <SettingsScreen onClose={() => dispatch(setShowSettings(false))} />}
      {showNewFolderModal && (
        <NewFolderModal
          onClose={() => dispatch(setShowNewFolderModal(false))}
          onCreateFolder={handleCreateFolder}
        />
      )}
    </main>
  )
}

export default App
