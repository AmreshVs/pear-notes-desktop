import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play } from 'lucide-react'

import { formatTime } from '../utils/formatters'

export default function AudioPlayer({ src, duration: propDuration, title }) {
  const { t } = useTranslation()
  const displayTitle = title || t('attachments.audioRecording')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [internalDuration, setInternalDuration] = useState(propDuration || 0)
  const mediaRef = useRef(null)
  const rafRef = useRef(null)
  const playStartRef = useRef(null)
  const elapsedBeforePauseRef = useRef(0)

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const updateDuration = () => {
      if (media.duration && media.duration !== Infinity) {
        setInternalDuration(media.duration)
      }
    }

    media.addEventListener('loadedmetadata', updateDuration)
    media.addEventListener('durationchange', updateDuration)

    setCurrentTime(0)
    setIsPlaying(false)
    playStartRef.current = null
    elapsedBeforePauseRef.current = 0
    updateDuration()

    if (src) {
      media.load()
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      media.removeEventListener('loadedmetadata', updateDuration)
      media.removeEventListener('durationchange', updateDuration)
    }
  }, [src])

  const stopTimer = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const startTimer = (duration) => {
    const tick = () => {
      if (playStartRef.current === null) return
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - playStartRef.current) / 1000
      if (duration > 0 && elapsed >= duration) {
        setCurrentTime(0)
        setIsPlaying(false)
        playStartRef.current = null
        elapsedBeforePauseRef.current = 0
        const media = mediaRef.current
        if (media) media.pause()
        stopTimer()
        return
      }
      setCurrentTime(elapsed)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const togglePlayPause = async (e) => {
    e?.stopPropagation()
    const media = mediaRef.current
    if (!media) return

    if (isPlaying) {
      media.pause()
      if (playStartRef.current !== null) {
        elapsedBeforePauseRef.current += (Date.now() - playStartRef.current) / 1000
        playStartRef.current = null
      }
      stopTimer()
      setIsPlaying(false)
    } else {
      try {
        await media.play()
        playStartRef.current = Date.now()
        setIsPlaying(true)
        startTimer(internalDuration || propDuration || 0)
      } catch (error) {
        console.error('Audio play failed:', error)
        setIsPlaying(false)
      }
    }
  }

  const displayDuration = internalDuration || propDuration || 0

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    elapsedBeforePauseRef.current = time
    playStartRef.current = isPlaying ? Date.now() : null
    if (mediaRef.current) {
      mediaRef.current.currentTime = time
    }
  }

  const progressPercent = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0

  return (
    <div className='flex flex-col bg-bg-secondary border border-border-primary rounded-xl group transition-all duration-300'>
      <div className='flex items-center gap-4 p-4'>
        <audio ref={mediaRef} src={src} preload='auto' />
        <button
          onClick={togglePlayPause}
          className='flex-shrink-0 w-12 h-12 rounded-full bg-accent-primary flex items-center justify-center text-accent-on-primary active:scale-95 transition-transform'
        >
          {isPlaying ? (
            <Pause className='w-5 h-5 fill-white' />
          ) : (
            <Play className='w-5 h-5 fill-white ml-0.5' />
          )}
        </button>

        <div className='flex-1 min-w-0'>
          <p className='text-sm font-semibold text-text-primary truncate mb-1'>{displayTitle}</p>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded-md'>
              {t('audioPlayer.label')}
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
            className='absolute top-0 left-0 h-full bg-accent-primary rounded-full pointer-events-none'
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className='absolute w-3 h-3 bg-white border-2 border-accent-primary rounded-full shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none z-20'
            style={{
              left: `${progressPercent}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
      </div>
    </div>
  )
}
