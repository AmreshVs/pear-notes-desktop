import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Duplex } from 'stream'

import App from './App.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import './styles.css'
import { store } from '@pear-notes/core/store/store.js'
import FramedStream from 'framed-stream'
import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import { setRPC } from '@pear-notes/core/rpc.js'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { themeStorage } from '@pear-notes/core/store/services/storageService.js'

const { ipcRenderer } = window.require('electron')

class WorkerIPCStream extends Duplex {
  constructor () {
    super()
    this._cleanup = window.electronBridge.onWorkerData((chunk) => {
      this.push(Buffer.from(chunk))
    })
  }

  _read () {}

  _write (chunk, encoding, callback) {
    ipcRenderer.send('worker-data', Buffer.from(chunk))
    callback()
  }

  _destroy (err, callback) {
    if (this._cleanup) this._cleanup()
    callback(err)
  }
}

const workerStream = new WorkerIPCStream()
const stream = new FramedStream(workerStream)
const rpc = new HRPC(stream)
setRPC(rpc)

if (!globalThis.production) {
  globalThis.store = store
  console.log('redux store exposed as globalThis.store')
}

window.addEventListener('beforeunload', () => {
  backendApi.destroy()
})

themeStorage.apply(themeStorage.load())

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <Provider store={store}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </Provider>
)
