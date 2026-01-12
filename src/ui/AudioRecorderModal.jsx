import { useState, useRef, useEffect } from 'react'
import { Mic, Square, X, Check } from 'lucide-react'
import AudioPlayer from './AudioPlayer'

export default function AudioRecorderModal({ onClose, onSaveAudio }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleSave = () => {
    if (audioBlob) {
      setIsSaving(true)
      const reader = new FileReader()
      reader.onload = (e) => {
        onSaveAudio({
          data: e.target.result,
          duration: recordingTime
        })
        setTimeout(() => {
          onClose()
        }, 300)
      }
      reader.readAsDataURL(audioBlob)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200'
        onClick={!isRecording ? onClose : undefined}
      />

      {/* Modal */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none'>
        <div className='bg-bg-panel border border-border-secondary rounded-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 fade-in duration-200'>
          {/* Header */}
          <div className='flex items-center justify-between p-5 border-b border-border-secondary'>
            <h2 className='text-lg font-semibold text-text-primary'>Record Audio</h2>
            <button
              onClick={onClose}
              disabled={isRecording}
              className={`p-1.5 rounded-lg transition-colors ${
                isRecording 
                  ? 'opacity-30 cursor-not-allowed' 
                  : 'hover:bg-bg-tertiary'
              }`}
              title='Close'
            >
              <X className='w-5 h-5 text-text-secondary' />
            </button>
          </div>

          {/* Recording Interface */}
          <div className='p-8'>
            <div className='flex flex-col items-center gap-8'>
              {/* Recording Time */}
              <div className='text-center relative'>
                <div className='relative z-10'>
                  <div className='text-5xl font-mono font-bold text-text-primary mb-3 tracking-tight'>
                    {formatTime(recordingTime)}
                  </div>
                  <div className='flex items-center justify-center gap-2'>
                    {isRecording && (
                      <div className='w-2 h-2 rounded-full bg-accent-danger' />
                    )}
                    <p className='text-sm font-medium text-text-secondary'>
                      {isRecording ? 'Recording...' : audioBlob ? 'Recording complete!' : 'Ready to record'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Record Button with enhanced styling */}
              {!audioBlob && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
                    isRecording
                      ? 'bg-accent-danger hover:bg-accent-danger/90'
                      : 'bg-accent-primary hover:bg-accent-primary/90 hover:scale-105'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                  <div className='relative z-10'>
                    {isRecording ? (
                      <Square className='w-7 h-7 text-white fill-white' />
                    ) : (
                      <Mic className='w-7 h-7 text-white' />
                    )}
                  </div>
                </button>
              )}

              {/* Audio Preview with custom player */}
              {audioBlob && (
                <div className='w-full'>
                  <AudioPlayer 
                    src={URL.createObjectURL(audioBlob)} 
                    duration={recordingTime}
                    title="Preview Recording"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions with enhanced buttons */}
          {audioBlob && (
            <div className='flex gap-3 p-5 border-t border-border-secondary bg-bg-secondary/50'>
              <button
                onClick={() => {
                  setAudioBlob(null)
                  setRecordingTime(0)
                }}
                disabled={isSaving}
                className='flex-1 px-5 py-3 rounded-xl bg-bg-tertiary hover:bg-bg-panel text-text-secondary hover:text-text-primary transition-all font-medium border border-border-primary disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Re-record
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-1 px-5 py-3 rounded-xl transition-all font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isSaving
                    ? 'bg-accent-primary/70 text-white cursor-wait'
                    : 'bg-accent-primary hover:bg-accent-primary/90 text-white hover:scale-105 active:scale-95'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                    Inserting...
                  </>
                ) : (
                  <>
                    <Check className='w-4 h-4' />
                    Insert Audio
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
