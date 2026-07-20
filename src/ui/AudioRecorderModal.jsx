import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, Square, X } from 'lucide-react'

import { formatTime } from '../utils/formatters'

import AudioPlayer from './AudioPlayer'

export default function AudioRecorderModal({ onClose, onSaveAudio }) {
  const { t } = useTranslation()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioDataUrl, setAudioDataUrl] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (!audioBlob) {
      setAudioDataUrl(null)
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setAudioDataUrl(reader.result)
    reader.readAsDataURL(audioBlob)
  }, [audioBlob])

  useEffect(() => {
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
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert(t('audioRecorderModal.accessError'))
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
    if (audioDataUrl) {
      setIsSaving(true)
      onSaveAudio({
        data: audioDataUrl,
        duration: recordingTime
      })
      setTimeout(() => {
        onClose()
      }, 300)
    }
  }

  return (
    <>
      <div className='fixed inset-0 flex items-center justify-center z-[110] p-6'>
        <div
          className='absolute inset-0 bg-backdrop-medium backdrop-blur-xl animate-in fade-in duration-300'
          onClick={!isRecording ? onClose : undefined}
        />
        <div className='relative bg-bg-panel/95 backdrop-blur-3xl border border-border-primary rounded-[2rem] w-full max-w-sm shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out flex flex-col'>
          <div className='absolute -top-32 -left-32 w-64 h-64 bg-accent-primary/10 blur-[80px] rounded-full pointer-events-none' />
          <div className='absolute -bottom-32 -right-32 w-64 h-64 bg-accent-primary/5 blur-[80px] rounded-full pointer-events-none' />
          <div className='bg-overlay-faint border-b border-overlay-soft flex items-center justify-between px-6 py-5 relative z-10'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary border border-accent-primary/20'>
                <Mic className='w-4 h-4' />
              </div>
              <div className='flex flex-col'>
                <h2 className='text-text-primary font-black text-xl tracking-tighter leading-none'>
                  {t('audioRecorderModal.title')}
                </h2>
                <span className='text-xs font-black uppercase tracking-[0.2em] mt-1 text-text-tertiary opacity-40'>
                  {t('audioRecorderModal.subtitle')}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isRecording}
              className={`w-8 h-8 flex items-center justify-center bg-overlay-subtle hover:bg-overlay-medium text-text-tertiary hover:text-text-primary rounded-full transition-all active:scale-90 border border-overlay-soft ${
                isRecording ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              title={t('common.close')}
            >
              <X className='w-4 h-4' />
            </button>
          </div>
          <div className='p-8 relative z-10'>
            <div className='flex flex-col items-center gap-2'>
              <div className='text-center'>
                <div className='text-5xl font-mono font-black text-text-primary mb-3 tracking-tighter'>
                  {formatTime(recordingTime)}
                </div>
              </div>
              {!audioBlob && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 group ${
                    isRecording
                      ? 'bg-accent-danger shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                      : 'bg-accent-primary shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(220,163,35,0.3)] hover:scale-105 active:scale-95'
                  }`}
                  title={isRecording ? t('audioRecorderModal.stop') : t('audioRecorderModal.start')}
                >
                  <div
                    className={`absolute inset-0 rounded-full ${isRecording ? 'animate-soft-ping' : 'group-hover:animate-soft-ping'}`}
                  />
                  <div className='relative z-10'>
                    {isRecording ? (
                      <Square className='w-7 h-7 text-white fill-white' />
                    ) : (
                      <Mic className='w-7 h-7 text-white' />
                    )}
                  </div>
                </button>
              )}
              {audioBlob && (
                <div className='w-full animate-in slide-in-from-bottom-4 duration-300'>
                  <AudioPlayer
                    src={audioDataUrl}
                    duration={recordingTime}
                    title={t('audioRecorderModal.previewTitle')}
                  />
                </div>
              )}
            </div>
          </div>
          {audioBlob && (
            <div className='flex gap-3 p-5 border-t border-overlay-soft bg-overlay-faint relative z-10'>
              <button
                onClick={() => {
                  setAudioBlob(null)
                  setRecordingTime(0)
                }}
                disabled={isSaving}
                className='flex-1 px-4 py-3 rounded-xl bg-bg-tertiary/40 hover:bg-bg-tertiary/60 text-text-secondary hover:text-text-primary transition-all font-bold text-sm tracking-tight border border-overlay-soft disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
              >
                {t('audioRecorderModal.rerecord')}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-1 px-4 py-3 rounded-xl transition-all font-bold text-sm tracking-tight disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                  isSaving
                    ? 'bg-accent-primary/70 text-accent-on-primary cursor-wait'
                    : 'bg-accent-primary hover:bg-accent-primary/90 text-accent-on-primary shadow-accent-primary/20 hover:scale-[1.02]'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className='w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                    {t('audioRecorderModal.saving')}
                  </>
                ) : (
                  <>{t('audioRecorderModal.insert')}</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
