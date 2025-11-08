import { useCallback, useState } from 'react'
import TitleBar from './ui/TitleBar'
import Button from './ui/Button'
import { backendApi } from './backend/api'

function App() {
  const [emoji, setEmoji] = useState('desktop')

  const handlePress = useCallback(async () => {
    setEmoji(emoji === 'desktop' ? '🍐' : 'desktop')
    await backendApi.ready()
  }, [])

  return (
    <main className='min-h-screen flex flex-col'>
      <TitleBar />
      <div className='flex-1'>
        <h1>{emoji}</h1>
        <Button onClick={handlePress}>Toggle</Button>
      </div>
    </main>
  )
}

export default App
