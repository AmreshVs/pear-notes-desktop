import './nodeGlobals.js'
import './devFlag.js'
import './locales/i18n.js'
import './styles.css'

import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Buffer } from 'buffer'
import FramedStream from 'framed-stream'
import { Duplex } from 'streamx'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { setRPC } from '@pear-notes/core/rpc.js'
import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import { noteSavesSettled } from '@pear-notes/core/store/sagas/notesSaga.js'
import { setLocalAiAdapter } from '@pear-notes/core/store/services/localAiAdapter.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { themeStorage } from '@pear-notes/core/store/services/storageService.js'
import { flushNoteSaves } from '@pear-notes/core/store/slices/notesSlice.js'
import { getTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import CrashGate from './components/common/CrashGate.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { listenForCrashes } from './lib/crashReport.js'
import { electronAdapter } from './lib/localAi/electronAdapter.js'
import App from './App.jsx'

class WorkerIPCStream extends Duplex {
  constructor() {
    super()
    this._cleanup = window.electronBridge.onWorkerData((chunk) => {
      this.push(Buffer.from(chunk))
    })
  }

  _write(chunk, callback) {
    window.electronBridge.sendWorkerData(chunk)
    callback(null)
  }

  _destroy(callback) {
    if (this._cleanup) this._cleanup()
    callback(null)
  }
}

listenForCrashes()

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

window.electronBridge.onFlushSaves(() => {
  store.dispatch(flushNoteSaves())
  noteSavesSettled().finally(() => window.electronBridge.savesFlushed())
})

window.addEventListener('blur', () => store.dispatch(flushNoteSaves()))

window.addEventListener('beforeunload', () => {
  backendApi.destroy()
})

themeStorage.apply(themeStorage.load())

window.electronBridge.setNativeTheme(themeStorage.load())
let storeTheme = getTheme(store.getState())
store.subscribe(() => {
  const theme = getTheme(store.getState())
  if (theme === storeTheme) return
  storeTheme = theme
  window.electronBridge.setNativeTheme(theme || 'system')
})

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <CrashGate>
    <Provider store={store}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Provider>
  </CrashGate>
)
