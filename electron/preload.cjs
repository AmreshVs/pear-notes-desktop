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
  getDeviceName: () => ipcRenderer.sendSync('get-device-name'),
  getAppDir: () => ipcRenderer.sendSync('get-app-dir'),
  getAppFlags: () => ipcRenderer.sendSync('get-app-flags'),
  reload: () => ipcRenderer.send('app-reload'),
  quit: () => ipcRenderer.send('app-quit'),

  sendWorkerData: (data) => ipcRenderer.send('worker-data', data),
  onWorkerData: (callback) => {
    const handler = (event, data) => callback(data)
    ipcRenderer.on('worker-data', handler)
    return () => ipcRenderer.removeListener('worker-data', handler)
  },

  onPowerState: (callback) => {
    const handler = (event, state) => callback(state)
    ipcRenderer.on('power-state', handler)
    return () => ipcRenderer.removeListener('power-state', handler)
  },

  authenticate: (reason) => ipcRenderer.invoke('device-auth:authenticate', reason),
  isDeviceAuthSupported: () => ipcRenderer.invoke('device-auth:is-supported'),

  setContentProtection: (enabled) => ipcRenderer.invoke('content-protection:set', enabled),

  setCloseToTray: (enabled) => ipcRenderer.send('close-to-tray:set', enabled),
  setStartAtLogin: (enabled) => ipcRenderer.invoke('login-item:set', enabled),
  getStartAtLogin: () => ipcRenderer.invoke('login-item:get'),
  setPowerSaveBlocker: (enabled) => ipcRenderer.send('power-save-blocker:set', enabled),

  showContextMenu: (items) => ipcRenderer.invoke('ui:context-menu', items),

  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),

  checkAppUpdate: () => ipcRenderer.invoke('app-update:check-manifest'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  writeClipboard: (payload) => ipcRenderer.invoke('clipboard:write', payload),

  getCacheSize: () => ipcRenderer.invoke('cache:size'),
  clearCache: () => ipcRenderer.invoke('cache:clear'),

  localAiGetDeviceSupport: () => ipcRenderer.invoke('local-ai:device-support'),
  localAiGetDiskSpace: () => ipcRenderer.invoke('local-ai:disk-space'),
  localAiDownload: (payload) => ipcRenderer.invoke('local-ai:download', payload),
  onLocalAiDownloadProgress: (callback) => {
    const handler = (event, progress) => callback(progress)
    ipcRenderer.on('local-ai:download-progress', handler)
    return () => ipcRenderer.removeListener('local-ai:download-progress', handler)
  },
  onLocalAiTaskProgress: (callback) => {
    const handler = (event, progress) => callback(progress)
    ipcRenderer.on('local-ai:task-progress', handler)
    return () => ipcRenderer.removeListener('local-ai:task-progress', handler)
  },
  localAiCancel: (payload) => ipcRenderer.invoke('local-ai:cancel', payload),
  localAiDeleteModel: (payload) => ipcRenderer.invoke('local-ai:delete-model', payload),
  localAiCloseAndWipe: () => ipcRenderer.invoke('local-ai:close-and-wipe'),
  localAiTranscribe: (payload) => ipcRenderer.invoke('local-ai:transcribe', payload),
  localAiExtractText: (payload) => ipcRenderer.invoke('local-ai:extract-text', payload),
  localAiDescribeImage: (payload) => ipcRenderer.invoke('local-ai:describe-image', payload),
  localAiSummarize: (payload) => ipcRenderer.invoke('local-ai:summarize', payload),
  localAiTranslate: (payload) => ipcRenderer.invoke('local-ai:translate', payload),
  localAiCancelTask: () => ipcRenderer.invoke('local-ai:cancel-task')
}
