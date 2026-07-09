const { ipcRenderer, webUtils } = require('electron')

window.electronBridge = {
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },

  getStoragePath: () => ipcRenderer.sendSync('get-storage-path'),
  getAppDir: () => ipcRenderer.sendSync('get-app-dir'),
  reload: () => ipcRenderer.send('app-reload'),
  quit: () => ipcRenderer.send('app-quit'),

  sendWorkerData: (data) => ipcRenderer.send('worker-data', data),
  onWorkerData: (callback) => {
    const handler = (event, data) => callback(data)
    ipcRenderer.on('worker-data', handler)
    return () => ipcRenderer.removeListener('worker-data', handler)
  },

  authenticate: (reason) => ipcRenderer.invoke('device-auth:authenticate', reason),
  isDeviceAuthSupported: () => ipcRenderer.invoke('device-auth:is-supported'),

  setContentProtection: (enabled) => ipcRenderer.invoke('content-protection:set', enabled),

  setCloseToTray: (enabled) => ipcRenderer.send('close-to-tray:set', enabled),
  setStartAtLogin: (enabled) => ipcRenderer.invoke('login-item:set', enabled),

  showContextMenu: (items) => ipcRenderer.invoke('ui:context-menu', items),

  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options)
}
