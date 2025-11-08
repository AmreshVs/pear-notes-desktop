import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { createNote, updateNote, deleteNote, setSelectedNote } from './store/notesSlice'
import {
  setSelectedFolder,
  setSearchQuery,
  setShowSettings,
  setShowNewFolderModal,
  setEditor,
  toggleTheme,
  createFolder
} from './store/uiSlice'
import TitleBar from './ui/TitleBar'
import FoldersSidebar from './ui/FoldersSidebar'
import NotesList from './ui/NotesList'
import NoteEditor from './ui/NoteEditor'
import Toolbar from './ui/Toolbar'
import ResizablePanel from './ui/ResizablePanel'
import SettingsScreen from './ui/SettingsScreen'
import NewFolderModal from './ui/NewFolderModal'

function App() {
  const dispatch = useAppDispatch()

  // Select state from Redux store
  const notes = useAppSelector((state) => state.notes.notes)
  const selectedNote = useAppSelector((state) => state.notes.selectedNote)
  const isLoading = useAppSelector((state) => state.notes.isLoading)
  const selectedFolder = useAppSelector((state) => state.ui.selectedFolder)
  const searchQuery = useAppSelector((state) => state.ui.searchQuery)
  const showSettings = useAppSelector((state) => state.ui.showSettings)
  const showNewFolderModal = useAppSelector((state) => state.ui.showNewFolderModal)
  const folders = useAppSelector((state) => state.ui.folders)
  const editor = useAppSelector((state) => state.ui.editor)
  const theme = useAppSelector((state) => state.ui.theme)

  // Handlers using Redux actions
  const handleCreateNote = () => {
    const newKey = Date.now().toString()
    const now = Date.now()
    const newNote = {
      key: newKey,
      value: {
        title: '',
        content: '',
        folder: selectedFolder === 'all' ? null : selectedFolder,
        createdAt: now,
        updatedAt: now
      }
    }

    dispatch(createNote(newNote))
    dispatch(setSearchQuery(''))
  }

  const handleSelectNote = (note) => {
    dispatch(setSelectedNote(note))
  }

  const handleUpdateNote = ({ key, title, content, contentHtml }) => {
    dispatch(updateNote({ key, title, content, contentHtml }))
  }

  const handleDeleteNote = (key) => {
    dispatch(deleteNote(key))
  }

  const handleEditorReady = (editorInstance) => {
    dispatch(setEditor(editorInstance))
  }

  const handleCreateFolder = (name) => {
    dispatch(createFolder({ name }))
  }

  // Data is loaded automatically by rootSaga on app initialization

  // Sort and filter notes - memoized for performance
  const filteredNotes = useMemo(() => {
    // Sort notes by updatedAt descending for display
    const sortedNotes = [...notes].sort((a, b) => {
      const aTime = a.value?.updatedAt || a.value?.createdAt || 0
      const bTime = b.value?.updatedAt || b.value?.createdAt || 0
      return bTime - aTime
    })

    // Filter by folder
    const folderFiltered = sortedNotes.filter((note) => {
      if (selectedFolder === 'all') return true
      return note.value?.folder === selectedFolder
    })

    // Filter by search query
    if (!searchQuery) return folderFiltered
    const query = searchQuery.toLowerCase()
    return folderFiltered.filter((note) => {
      const title = (note.value?.title || '').toLowerCase()
      const content = (note.value?.content || '').toLowerCase()
      return title.includes(query) || content.includes(query)
    })
  }, [notes, selectedFolder, searchQuery])

  if (isLoading) {
    return (
      <main className='min-h-screen flex flex-col' style={{ backgroundColor: 'var(--bg-primary)' }}>
        <TitleBar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <div
              className='animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3'
              style={{ borderColor: 'var(--accent-primary)' }}
            ></div>
            <p className='text-[15px]' style={{ color: 'var(--text-tertiary)' }}>
              Loading...
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className='min-h-screen flex flex-col' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TitleBar />
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Toolbar */}
        <Toolbar
          searchQuery={searchQuery}
          onSearchChange={(value) => dispatch(setSearchQuery(value))}
        />

        {/* Three Column Layout */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Left: Folders Sidebar (Resizable) */}
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

          {/* Middle: Notes List (Resizable) */}
          <ResizablePanel defaultWidth={280} minWidth={200} maxWidth={500}>
            <NotesList
              notes={filteredNotes}
              selectedNote={selectedNote}
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
              selectedFolder={selectedFolder}
            />
          </ResizablePanel>

          {/* Right: Note Editor */}
          <NoteEditor
            note={selectedNote}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            onEditorReady={handleEditorReady}
          />
        </div>
      </div>

      {/* Modals */}
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
