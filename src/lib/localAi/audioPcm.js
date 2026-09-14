const TARGET_SAMPLE_RATE = 16000
const MONO = 1

export async function decodeAudioToPcm(arrayBuffer) {
  const decoder = new OfflineAudioContext(MONO, 1, TARGET_SAMPLE_RATE)
  const decoded = await decoder.decodeAudioData(arrayBuffer.slice(0))
  const mixer = new OfflineAudioContext(MONO, Math.max(1, decoded.length), TARGET_SAMPLE_RATE)
  const source = mixer.createBufferSource()
  source.buffer = decoded
  source.connect(mixer.destination)
  source.start()
  const rendered = await mixer.startRendering()
  const samples = rendered.getChannelData(0)
  const pcm = new Int16Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return new Uint8Array(pcm.buffer)
}
