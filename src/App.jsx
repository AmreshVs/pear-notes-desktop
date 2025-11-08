import { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './ui/TitleBar'
import FoldersSidebar from './ui/FoldersSidebar'
import NotesList from './ui/NotesList'
import NoteEditor from './ui/NoteEditor'
import Toolbar from './ui/Toolbar'
import ResizablePanel from './ui/ResizablePanel'
import SyncScreen from './ui/SyncScreen'
import SettingsScreen from './ui/SettingsScreen'

// Mock data storage - using localStorage for persistence
const STORAGE_KEY = 'pear-notes-mock-data'

function App() {
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showSync, setShowSync] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editor, setEditor] = useState(null)
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to 'dark'
    const savedTheme = localStorage.getItem('pear-notes-theme')
    return savedTheme || 'dark'
  })

  // Load notes from localStorage on mount
  useEffect(() => {
    const loadNotesFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsedNotes = JSON.parse(stored)
          setNotes(parsedNotes)

          // Select first note if available
          if (parsedNotes.length > 0) {
            setSelectedNote(parsedNotes[0])
          }
        } else {
          // Initialize with sample notes
          const sampleNotes = [
            {
              key: '1',
              value: {
                title: 'Brainstorming Session',
                content:
                  'Ideas for the new P2P protocol:\n\nNext steps:\n• Research existing DHT implementations.\n• Draft a preliminary specification for the protocol.\n• Create a proof-of-concept application.',
                folder: 'work',
                createdAt: Date.now() - 3600000, // 1 hour ago
                updatedAt: Date.now() - 3600000
              }
            },
            {
              key: '2',
              value: {
                title: 'Meeting Notes - Q3 Planning',
                content:
                  'Key takeaways and action items from our quarterly planning meeting. We discussed product roadmap, engineering priorities, and resource allocation.',
                folder: 'work',
                createdAt: Date.now() - 86400000, // 1 day ago
                updatedAt: Date.now() - 86400000
              }
            },
            {
              key: '3',
              value: {
                title: 'Personal To-Do List',
                content:
                  '1. Buy groceries\n2. Finish the UI design mockups\n3. Schedule dentist appointment\n4. Review project proposal',
                folder: 'personal',
                createdAt: Date.now() - 172800000, // 2 days ago
                updatedAt: Date.now() - 172800000
              }
            },
            {
              key: '4',
              value: {
                title: 'Project Alpha Launch Plan',
                content:
                  'A comprehensive checklist for the upcoming launch. Includes marketing strategy, technical requirements, and timeline milestones.',
                folder: 'work',
                createdAt: Date.now() - 259200000, // 3 days ago
                updatedAt: Date.now() - 259200000
              }
            }
          ]
          setNotes(sampleNotes)
          setSelectedNote(sampleNotes[0])
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleNotes))
        }
      } catch (error) {
        console.error('Failed to load notes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotesFromStorage()
  }, [])

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    }
  }, [notes, isLoading])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pear-notes-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const handleCreateNote = useCallback(() => {
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

    setNotes((prevNotes) => [newNote, ...prevNotes])
    setSelectedNote(newNote)
    setSearchQuery('')
  }, [selectedFolder])

  const handleSelectNote = useCallback((note) => {
    setSelectedNote(note)
  }, [])

  const handleUpdateNote = useCallback(({ key, title, content, contentHtml }) => {
    setNotes((prevNotes) => {
      return prevNotes.map((note) => {
        if (note.key === key) {
          return {
            ...note,
            value: {
              ...note.value,
              title: title !== undefined ? title : note.value.title,
              content: content !== undefined ? content : note.value.content,
              contentHtml: contentHtml !== undefined ? contentHtml : note.value.contentHtml,
              updatedAt: Date.now()
            }
          }
        }
        return note
      })
    })

    // Update selected note in real-time
    setSelectedNote((prev) => {
      if (prev?.key === key) {
        return {
          ...prev,
          value: {
            ...prev.value,
            title: title !== undefined ? title : prev.value.title,
            content: content !== undefined ? content : prev.value.content,
            contentHtml: contentHtml !== undefined ? contentHtml : prev.value.contentHtml,
            updatedAt: Date.now()
          }
        }
      }
      return prev
    })
  }, [])

  const handleDeleteNote = useCallback(
    (key) => {
      setNotes((prevNotes) => {
        const filtered = prevNotes.filter((note) => note.key !== key)
        // Sort by updatedAt descending
        const sorted = filtered.sort((a, b) => {
          const aTime = a.value?.updatedAt || a.value?.createdAt || 0
          const bTime = b.value?.updatedAt || b.value?.createdAt || 0
          return bTime - aTime
        })

        // Update selection if deleted note was selected
        if (selectedNote?.key === key) {
          if (sorted.length > 0) {
            setSelectedNote(sorted[0])
          } else {
            setSelectedNote(null)
          }
        }

        return sorted
      })
    },
    [selectedNote]
  )

  if (isLoading) {
    return (
      <main className='min-h-screen flex flex-col bg-[#121214]'>
        <TitleBar />
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF] mx-auto mb-3'></div>
            <p className='text-[15px] text-[#8e8e93]'>Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  // Sort notes by updatedAt descending for display
  const sortedNotes = [...notes].sort((a, b) => {
    const aTime = a.value?.updatedAt || a.value?.createdAt || 0
    const bTime = b.value?.updatedAt || b.value?.createdAt || 0
    return bTime - aTime
  })

  // Filter notes by search query
  const filteredNotes = sortedNotes.filter((note) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const title = (note.value?.title || '').toLowerCase()
    const content = (note.value?.content || '').toLowerCase()
    return title.includes(query) || content.includes(query)
  })

  return (
    <main className='min-h-screen flex flex-col' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TitleBar />
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Toolbar */}
        <Toolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSettingsClick={() => setShowSettings(true)}
          onSyncClick={() => setShowSync(true)}
          onThemeToggle={toggleTheme}
          theme={theme}
          editor={editor}
        />

        {/* Three Column Layout */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Left: Folders Sidebar */}
          <FoldersSidebar
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
            notes={notes}
            onCreateNote={handleCreateNote}
          />

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
            onEditorReady={setEditor}
          />
        </div>
      </div>

      {/* Modals */}
      {showSync && <SyncScreen onClose={() => setShowSync(false)} />}
      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
    </main>
  )
}

export default App
