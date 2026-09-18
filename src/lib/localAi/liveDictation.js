import { LOCAL_AI_ERROR } from '@pear-notes/core/store/services/localAiCatalog.js'

import { LocalAiError } from './electronAdapter'

const TARGET_SAMPLE_RATE = 16000
const PROCESSOR_FRAMES = 4096
const WAV_HEADER_BYTES = 44
const BYTES_PER_SAMPLE = 2

export const MIC_DENIED = 'MIC_DENIED'

let sessionCounter = 0

function getBridge() {
  return typeof window !== 'undefined' ? window.electronBridge : null
}

async function invoke(method, payload) {
  const bridge = getBridge()
  if (typeof bridge?.[method] !== 'function') throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)
  const result = await bridge[method](payload)
  if (!result?.ok) throw new LocalAiError(result?.code ?? LOCAL_AI_ERROR.TASK_FAILED, result?.message)
  return result
}

export function supportsLiveDictation() {
  return typeof getBridge()?.localAiLiveStart === 'function'
}

function toPcm16k(input, inputRate) {
  const ratio = inputRate / TARGET_SAMPLE_RATE
  const length = Math.floor(input.length / ratio)
  const pcm = new Int16Array(length)
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(input.length, Math.floor((index + 1) * ratio))
    let sum = 0
    for (let cursor = start; cursor < end; cursor += 1) sum += input[cursor]
    const sample = Math.max(-1, Math.min(1, end > start ? sum / (end - start) : 0))
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return new Uint8Array(pcm.buffer)
}

function rmsLevel(input) {
  let sum = 0
  for (let index = 0; index < input.length; index += 1) sum += input[index] * input[index]
  return Math.min(1, Math.sqrt(sum / Math.max(1, input.length)) * 4)
}

export function pcmChunksToWav(chunks) {
  const dataLength = chunks.reduce((total, chunk) => total + chunk.length, 0)
  if (dataLength === 0) return null
  const bytes = new Uint8Array(WAV_HEADER_BYTES + dataLength)
  const view = new DataView(bytes.buffer)
  const ascii = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_SAMPLE_RATE, true)
  view.setUint32(28, TARGET_SAMPLE_RATE * BYTES_PER_SAMPLE, true)
  view.setUint16(32, BYTES_PER_SAMPLE, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, dataLength, true)
  let offset = WAV_HEADER_BYTES
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

export function joinPcmChunks(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const joined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.length
  }
  return joined
}

export async function startLiveTranscription(feature, featureConfig, { onText, onLevel }) {
  const bridge = getBridge()
  if (!supportsLiveDictation()) throw new LocalAiError(LOCAL_AI_ERROR.MODEL_MISSING)

  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
    })
  } catch {
    throw new LocalAiError(MIC_DENIED)
  }

  sessionCounter += 1
  const sessionId = `live-${Date.now()}-${sessionCounter}`
  const unsubscribe = bridge.onLocalAiLiveText?.((update) => {
    if (update?.sessionId === sessionId) onText(String(update.text ?? ''))
  })
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop())

  try {
    await invoke('localAiLiveStart', { sessionId, feature, featureConfig: featureConfig ?? {} })
  } catch (error) {
    unsubscribe?.()
    stopTracks()
    throw error
  }

  const context = new AudioContext()
  const source = context.createMediaStreamSource(stream)
  const processor = context.createScriptProcessor(PROCESSOR_FRAMES, 1, 1)
  const silence = context.createGain()
  silence.gain.value = 0
  const captured = []
  let closed = false

  processor.onaudioprocess = (event) => {
    if (closed) return
    const input = event.inputBuffer.getChannelData(0)
    onLevel?.(rmsLevel(input))
    const pcm = toPcm16k(input, context.sampleRate)
    captured.push(pcm)
    bridge.localAiLiveChunk({ sessionId, pcm })
  }
  source.connect(processor)
  processor.connect(silence)
  silence.connect(context.destination)

  const release = () => {
    if (closed) return
    closed = true
    processor.onaudioprocess = null
    source.disconnect()
    processor.disconnect()
    silence.disconnect()
    context.close().catch(() => {})
    stopTracks()
  }

  return {
    stop: async () => {
      release()
      try {
        const { text } = await invoke('localAiLiveStop', { sessionId })
        return String(text ?? '').trim()
      } finally {
        unsubscribe?.()
      }
    },
    cancel: () => {
      release()
      unsubscribe?.()
      invoke('localAiLiveCancel', { sessionId }).catch(() => {})
    },
    capturedChunks: () => captured
  }
}
