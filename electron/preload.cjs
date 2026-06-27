const { ipcRenderer } = require('electron')

window.electronBridge = {
  getStoragePath: () => ipcRenderer.sendSync('get-storage-path'),
  getAppDir: () => ipcRenderer.sendSync('get-app-dir'),
  reload: () => ipcRenderer.send('app-reload'),
  quit: () => ipcRenderer.send('app-quit'),

  sendWorkerData: (data) => ipcRenderer.send('worker-data', data),
  onWorkerData: (callback) => {
    const handler = (event, data) => callback(data)
    ipcRenderer.on('worker-data', handler)
    return () => ipcRenderer.removeListener('worker-data', handler)
  }
}
