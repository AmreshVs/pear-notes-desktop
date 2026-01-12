/** @typedef {import('pear-interface')} */ /* global Pear */
import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
import updates from 'pear-updates'

updates((update) => {
  console.log('Application update available:', update)
})

const bridge = new Bridge({ mount: './dist', waypoint: 'index.html' })
await bridge.ready()

const runtime = new Runtime()
const pipe = await runtime.start({ bridge })
pipe.on('close', () => Pear.exit())