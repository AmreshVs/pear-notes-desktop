import { isReadAloudEnabled } from '@pear-notes/core/constant.js'
import { detectTextLanguage } from '@pear-notes/core/store/services/localAiLanguage.js'

const synth = () => (typeof window !== 'undefined' ? window.speechSynthesis : null)

export const canReadAloud = () => {
  if (!isReadAloudEnabled()) return false
  const voices = synth()?.getVoices() ?? null
  return Boolean(voices) && (voices.length === 0 || voices.some((voice) => voice.localService))
}

export const isReadingAloud = () => Boolean(synth()?.speaking)

export function readAloud(text) {
  const speech = synth()
  const words = String(text ?? '').trim()
  if (!speech || !words) return
  speech.cancel()
  const language = detectTextLanguage(words)
  const local = speech.getVoices().filter((voice) => voice.localService)
  const voice =
    local.find((option) => language && option.lang?.toLowerCase().startsWith(language)) ??
    local.find((option) => option.default) ??
    local[0]
  if (!voice) return false
  const utterance = new SpeechSynthesisUtterance(words)
  utterance.voice = voice
  utterance.lang = voice.lang
  speech.speak(utterance)
  return true
}

export const stopReadingAloud = () => synth()?.cancel()
