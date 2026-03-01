/* global Pear */
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import updates from 'pear-updates'
import run from 'pear-run'

import App from './App.jsx'
import './styles.css'
import { store } from '@pear-notes/core/store/store.js'
import FramedStream from 'framed-stream'
import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { setRPC } from '@pear-notes/core/rpc.js'


const worker = run(`${Pear.config.link}/src/backend/main.js`, ['amr'])
const stream = new FramedStream(worker)
const rpc = new HRPC(stream)
setRPC(rpc)

if (import.meta.env.DEV || globalThis.Pear?.config?.dev) {
  globalThis.store = store
  console.log('redux store exposed as globalThis.store')
}

const appUpdates = updates({ app: true })

appUpdates.on('data', () => {
  location.reload()
})

// Pear.teardown(() => backendApi.destroy())

window.addEventListener('beforeunload', () => {
  backendApi.destroy()
})

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)
