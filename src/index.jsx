import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.jsx'
import './styles.css'
import { store } from './store/store.js'
import FramedStream from 'framed-stream'
import HRPC from './spec/hrpc/'
import { setRPC } from './lib/rpc.js'

const worker = Pear.worker.run(`${Pear.config.applink}/src/backend/main.js`)
const stream = new FramedStream(worker)
const rpc = new HRPC(stream)
setRPC(rpc)

Pear.updates(() => Pear.reload())

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)
