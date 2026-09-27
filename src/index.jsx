import './devFlag.js'
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
import { setLocalAiAdapter } from '@pear-notes/core/store/services/localAiAdapter.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { themeStorage } from '@pear-notes/core/store/services/storageService.js'
import { store } from '@pear-notes/core/store/store.js'

import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { electronAdapter } from './lib/localAi/electronAdapter.js'
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
backendApi.captureAppLogs()

if (LOCAL_AI_ENABLED) setLocalAiAdapter(electronAdapter)

// `globalThis.production` was never assigned anywhere, so this branch always
// ran - the packaged app exposed the full store (notes, folders, settings and
// the pairing encryptionKey) on globalThis.
if (globalThis.__PEAR_DEV__) {
  globalThis.store = store
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
