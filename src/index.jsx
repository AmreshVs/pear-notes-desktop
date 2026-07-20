import './locales/i18n.js'
import './styles.css'

import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Buffer } from 'buffer'
import FramedStream from 'framed-stream'
import { Duplex } from 'stream'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { setRPC } from '@pear-notes/core/rpc.js'
import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import { themeStorage } from '@pear-notes/core/store/services/storageService.js'
import { store } from '@pear-notes/core/store/store.js'

import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import App from './App.jsx'

const { ipcRenderer } = window.require('electron')

class WorkerIPCStream extends Duplex {
  constructor() {
    super()
    this._cleanup = window.electronBridge.onWorkerData((chunk) => {
      this.push(Buffer.from(chunk))
    })
  }

  _read() {}

  _write(chunk, encoding, callback) {
    ipcRenderer.send('worker-data', Buffer.from(chunk))
    callback()
  }

  _destroy(err, callback) {
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
