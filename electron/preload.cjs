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

  showFatalError: (title, message) => ipcRenderer.send('app:fatal-error', { title, message }),
  // LEGACY(hyperdb-migration): see docs/HYPERDB-VIEW-MIGRATION-PLAN-2026-09-23.md section 8
  askLegacyVault: (texts) => ipcRenderer.invoke('app:legacy-vault', texts),

  isSecretStoreAvailable: () => ipcRenderer.sendSync('secret:available'),
  getSecret: (name) => ipcRenderer.sendSync('secret:get', name),
  setSecret: (name, value) => ipcRenderer.sendSync('secret:set', { name, value }),
  deleteSecret: (name) => ipcRenderer.sendSync('secret:delete', name),
  getDeviceName: () => ipcRenderer.sendSync('get-device-name'),
  getAppDir: () => ipcRenderer.sendSync('get-app-dir'),
  getAppFlags: () => ipcRenderer.sendSync('get-app-flags'),
  reload: () => ipcRenderer.send('app-reload'),
  quit: () => ipcRenderer.send('app-quit'),
  onFlushSaves: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('flush-saves', handler)
    return () => ipcRenderer.removeListener('flush-saves', handler)
  },
  savesFlushed: () => ipcRenderer.send('saves-flushed'),

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

  // A resume that arrived while no window existed, claimed once.
  takePendingPowerState: () => ipcRenderer.invoke('power-state:pending'),

  authenticate: (reason) => ipcRenderer.invoke('device-auth:authenticate', reason),
  isDeviceAuthSupported: () => ipcRenderer.invoke('device-auth:is-supported'),

  setContentProtection: (enabled) => ipcRenderer.invoke('content-protection:set', enabled),

  setNativeTheme: (theme) => ipcRenderer.send('native-theme:set', theme),

  setCloseToTray: (enabled) => ipcRenderer.send('close-to-tray:set', enabled),
  setStartAtLogin: (enabled) => ipcRenderer.invoke('login-item:set', enabled),
  getStartAtLogin: () => ipcRenderer.invoke('login-item:get'),
  openStartAtLoginSettings: () => ipcRenderer.invoke('login-item:open-system-settings'),
  setPowerSaveBlocker: (enabled) => ipcRenderer.send('power-save-blocker:set', enabled),

  showContextMenu: (items) => ipcRenderer.invoke('ui:context-menu', items),

  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  saveTextFile: (options) => ipcRenderer.invoke('dialog:saveTextFile', options),

  checkAppUpdate: () => ipcRenderer.invoke('app-update:check-manifest'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  writeClipboard: (payload) => ipcRenderer.invoke('clipboard:write', payload),

  getCacheSize: () => ipcRenderer.invoke('cache:size'),
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  getDeviceStorage: () => ipcRenderer.invoke('storage:device-usage'),
  deleteOldVaults: () => ipcRenderer.invoke('storage:delete-old-vaults'),

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
  localAiAsk: (payload) => ipcRenderer.invoke('local-ai:ask', payload),
  localAiCancelTask: () => ipcRenderer.invoke('local-ai:cancel-task'),
  localAiLiveStart: (payload) => ipcRenderer.invoke('local-ai:live-start', payload),
  localAiLiveChunk: (payload) => ipcRenderer.send('local-ai:live-chunk', payload),
  localAiLiveStop: (payload) => ipcRenderer.invoke('local-ai:live-stop', payload),
  localAiLiveCancel: (payload) => ipcRenderer.invoke('local-ai:live-cancel', payload),
  onLocalAiLiveText: (callback) => {
    const handler = (event, update) => callback(update)
    ipcRenderer.on('local-ai:live-text', handler)
    return () => ipcRenderer.removeListener('local-ai:live-text', handler)
  }
}
