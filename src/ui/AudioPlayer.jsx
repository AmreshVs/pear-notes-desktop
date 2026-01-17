import { Play, Pause } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function AudioPlayer({ src, duration: propDuration, title = 'Audio Recording' }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [internalDuration, setInternalDuration] = useState(propDuration || 0)
  const mediaRef = useRef(null)

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const handleTimeUpdate = () => setCurrentTime(media.currentTime)
    const handleLoadedMetadata = () => {
      if (media.duration && media.duration !== Infinity) {
        setInternalDuration(media.duration)
      }
    }
    const handleEnded = () => {
      setIsPlaying(false)
      media.currentTime = 0
      setCurrentTime(0)
    }

    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('ended', handleEnded)

    // Trigger duration load if already loaded
    if (media.duration && media.duration !== Infinity) {
      setInternalDuration(media.duration)
    }

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('ended', handleEnded)
    }
  }, [src])

  const togglePlayPause = (e) => {
    e?.stopPropagation()
    const media = mediaRef.current
    if (!media) return

    if (isPlaying) {
      media.pause()
    } else {
      media.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const displayDuration = internalDuration || propDuration || 0

  return (
    <div className='flex flex-col bg-bg-secondary border border-border-primary rounded-xl overflow-hidden group transition-all duration-300'>
      <div className='flex items-center gap-4 p-4'>
        <button
          onClick={togglePlayPause}
          className='flex-shrink-0 w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-white active:scale-95 transition-transform'
        >
          {isPlaying ? <Pause className='w-5 h-5 fill-white' /> : <Play className='w-5 h-5 fill-white ml-0.5' />}
          <audio ref={mediaRef} src={src} preload='metadata' />
        </button>

        <div className='flex-1 min-w-0'>
          <p className='text-sm font-semibold text-text-primary truncate mb-1'>{title}</p>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded-md'>
              AUDIO
            </span>
            <span className='text-xs text-text-tertiary'>•</span>
            <span className='text-xs text-text-tertiary font-mono'>
              {formatTime(currentTime)} / {formatTime(displayDuration)}
            </span>
          </div>
        </div>
      </div>

      <div className='h-1 bg-bg-tertiary w-full overflow-hidden'>
        <div
          className='h-full bg-accent-primary transition-all duration-100'
          style={{ width: `${(displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0)}%` }}
        />
      </div>
    </div>
  )
}
