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

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (mediaRef.current) {
      mediaRef.current.currentTime = time
    }
  }

  // Calculate the percentage for the slider handle position, ensuring it stays within bounds
  const handlePositionPercentage = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;
  // Adjust handle position to account for its width (12px) so it doesn't go off the edge
  const clampedHandlePosition = `calc(${handlePositionPercentage}% - ${handlePositionPercentage / 100 * 12}px + 6px)`;


  return (
    <div className='flex flex-col bg-bg-secondary border border-border-primary rounded-xl group transition-all duration-300'>
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

      <div className='px-4 pb-4'>
        <div className='relative h-1.5 bg-bg-tertiary w-full rounded-full group/slider'>
          <input
            type='range'
            min='0'
            max={displayDuration || 0}
            step='any'
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={(e) => e.stopPropagation()}
            className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30'
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className='absolute top-0 left-0 h-full bg-accent-primary rounded-full transition-all duration-100 ease-out pointer-events-none'
            style={{ width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%` }}
          />
          <div 
            className='absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-accent-primary rounded-full shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none z-20'
            style={{ left: clampedHandlePosition }}
          />
        </div>
      </div>
    </div>
  )
}
