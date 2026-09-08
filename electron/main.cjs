const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  Menu,
  dialog,
  Tray,
  nativeImage,
  powerMonitor,
  powerSaveBlocker,
  screen,
  shell,
  clipboard
} = require('electron')
const os = require('os')
const path = require('path')
const fs = require('fs')
const PearRuntime = require('pear-runtime')
const { isMac, isLinux } = require('which-runtime')

const pkg = require('../package.json')
const appName = pkg.productName ?? pkg.name
// Pinned to the original product name and deliberately not derived from appName:
// the storage directory is where every existing install keeps its notes, keys and
// pairing state, so renaming the app must not move it.
const storageDirName = 'PearNotes'
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const isMas = process.mas === true

const fallbackBuildNumber = String(pkg.masBuildNumber ?? '1')

function getBuildNumber() {
  if (!app.isPackaged || !isMac) return fallbackBuildNumber
  try {
    const plistPath = path.join(path.dirname(app.getPath('exe')), '..', 'Info.plist')
    const plist = fs.readFileSync(plistPath, 'utf8')
    const match = plist.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/)
    return match?.[1]?.trim() || fallbackBuildNumber
  } catch {
    return fallbackBuildNumber
  }
}

let deviceAuth = null
try {
  deviceAuth = require('../native/pear-device-auth')
} catch (e) {
  console.warn('pear-device-auth native module unavailable:', e.message)
}

let mainWindow = null
let worker = null
let tray = null
let closeToTray = true
let isQuitting = false
let powerSaveBlockerId = null
let workerFailureReported = false

function getDeviceName() {
  const hostname = (os.hostname() || '').replace(/\.local$/i, '').trim()
  if (!hostname || hostname.toLowerCase() === 'localhost') return `${appName} Desktop`
  return hostname
}

function getStoragePath() {
  const dirName = isDev ? `${storageDirName}-dev` : storageDirName
  const isSnap = !!process.env.SNAP_USER_COMMON
  const linuxConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return isMac
    ? path.join(os.homedir(), 'Library', 'Application Support', dirName)
    : isLinux
      ? isSnap
        ? path.join(process.env.SNAP_USER_COMMON, dirName)
        : path.join(linuxConfigHome, dirName)
      : path.join(os.homedir(), 'AppData', 'Roaming', dirName)
}

function getAppDir() {
  return isDev ? path.resolve(__dirname, '..') : path.dirname(app.getPath('exe'))
}

function ensureStorageDir() {
  const storagePath = getStoragePath()
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true })
  }
  return storagePath
}

function reportWorkerFailure(err) {
  console.error('[worker] failed to start', err)
  worker = null
  if (workerFailureReported) return
  workerFailureReported = true
  dialog.showErrorBox(
    `${appName} could not start its backend`,
    `The Bare sidecar process could not be launched.\n\n${err.message}\n\nReinstalling dependencies (npm install) usually restores it.`
  )
}

function reportWorkerExit(code) {
  if (isQuitting || workerFailureReported) return
  workerFailureReported = true
  dialog.showErrorBox(
    `${appName} could not start its backend`,
    `The Bare sidecar process stopped unexpectedly (exit code ${code}).\n\nAnother copy of ${appName} may still be running and holding your local database. Quit it, or log out and back in, then reopen ${appName}.`
  )
}

function startWorker() {
  const workerPath = require.resolve('../workers/main.js')
  const storagePath = ensureStorageDir()

  try {
    worker = PearRuntime.run(workerPath, [storagePath])
  } catch (err) {
    reportWorkerFailure(err)
    return
  }

  worker.on('error', reportWorkerFailure)
  if (worker._process) worker._process.on('error', reportWorkerFailure)

  worker.stdout.on('data', (data) => {
    console.log('[worker]', data.toString().trim())
  })

  worker.stderr.on('data', (data) => {
    console.error('[worker]', data.toString().trim())
  })

  worker.on('data', (chunk) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('worker-data', Buffer.from(chunk))
    }
  })

  worker.on('exit', (code) => {
    console.log('[worker] exited with code', code)
    worker = null
    if (code !== 0) reportWorkerExit(code)
  })
}

const WINDOW_AWAY_RESUME_MS = 5 * 60 * 1000
let windowAwaySince = null

function sendPowerState(state) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('power-state', state)
}

function markWindowAway() {
  if (windowAwaySince === null) windowAwaySince = Date.now()
}

function markWindowBack() {
  const awaySince = windowAwaySince
  windowAwaySince = null
  if (awaySince === null) return
  if (Date.now() - awaySince < WINDOW_AWAY_RESUME_MS) return
  sendPowerState('resume')
}

function watchWindowActivity(window) {
  windowAwaySince = null
  window.on('blur', markWindowAway)
  window.on('hide', markWindowAway)
  window.on('minimize', markWindowAway)
  window.on('focus', markWindowBack)
  window.on('show', markWindowBack)
  window.on('restore', markWindowBack)
}

function watchPowerState() {
  powerMonitor.on('suspend', () => sendPowerState('suspend'))
  powerMonitor.on('resume', () => sendPowerState('resume'))
}

const MIN_WINDOW_WIDTH = 880
const MIN_WINDOW_HEIGHT = 620
const MAX_DEFAULT_WINDOW_WIDTH = 1600
const MAX_DEFAULT_WINDOW_HEIGHT = 1200

// Size to the display rather than to a fixed number: a hardcoded default is either
// clamped down on a laptop or leaves half a large monitor unused.
function defaultWindowSize() {
  const { workAreaSize } = screen.getPrimaryDisplay()
  const clamp = (min, value, max) => Math.max(min, Math.min(max, value))

  return {
    width: clamp(
      MIN_WINDOW_WIDTH,
      Math.round(workAreaSize.width * 0.85),
      MAX_DEFAULT_WINDOW_WIDTH
    ),
    height: clamp(
      MIN_WINDOW_HEIGHT,
      Math.round(workAreaSize.height * 0.85),
      MAX_DEFAULT_WINDOW_HEIGHT
    )
  }
}

function createWindow() {
  const { width, height } = defaultWindowSize()

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    backgroundColor: '#1F2430',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: !isDev,
      plugins: true,
      pdfViewer: true
    }
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && closeToTray && tray) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  watchWindowActivity(mainWindow)
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png')
  const trayIconSize = isMac ? 16 : 32
  const icon = nativeImage
    .createFromPath(iconPath)
    .resize({ width: trayIconSize, height: trayIconSize })

  tray = new Tray(icon)
  tray.setToolTip(appName)

  const menu = Menu.buildFromTemplate([
    {
      label: `Open ${appName}`,
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createWindow()
    }
  })
}

function setupIPC() {
  ipcMain.on('worker-data', (event, data) => {
    if (worker) {
      worker.write(Buffer.from(data))
    }
  })

  ipcMain.on('get-storage-path', (event) => {
    event.returnValue = getStoragePath()
  })

  ipcMain.on('get-app-dir', (event) => {
    event.returnValue = getAppDir()
  })

  ipcMain.on('get-device-name', (event) => {
    event.returnValue = getDeviceName()
  })

  ipcMain.on('get-app-flags', (event) => {
    event.returnValue = { isMas, buildNumber: getBuildNumber() }
  })

  ipcMain.on('app-reload', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload()
    }
  })

  ipcMain.on('app-quit', () => {
    app.quit()
  })

  ipcMain.handle('device-auth:authenticate', async (event, reason) => {
    if (!deviceAuth) return false
    try {
      const windowHandle =
        mainWindow && !mainWindow.isDestroyed() ? mainWindow.getNativeWindowHandle() : null
      return await deviceAuth.authenticate(reason, windowHandle)
    } catch (e) {
      console.error('device-auth:authenticate failed', e)
      return false
    }
  })

  ipcMain.handle('device-auth:is-supported', () => {
    return deviceAuth ? deviceAuth.isSupported() : false
  })

  ipcMain.handle('content-protection:set', (event, enabled) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setContentProtection(enabled === true)
    }
    return true
  })

  ipcMain.on('close-to-tray:set', (event, enabled) => {
    closeToTray = enabled === true
  })

  ipcMain.on('power-save-blocker:set', (event, enabled) => {
    if (enabled) {
      if (powerSaveBlockerId === null || !powerSaveBlocker.isStarted(powerSaveBlockerId)) {
        powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
      }
    } else if (powerSaveBlockerId !== null) {
      powerSaveBlocker.stop(powerSaveBlockerId)
      powerSaveBlockerId = null
    }
  })

  ipcMain.handle('login-item:set', (event, enabled) => {
    try {
      app.setLoginItemSettings({ openAtLogin: enabled === true })
    } catch (err) {
      console.error('[login-item] could not update', err)
    }
    return app.getLoginItemSettings().openAtLogin === true
  })

  ipcMain.handle('login-item:get', () => app.getLoginItemSettings().openAtLogin === true)

  ipcMain.handle('ui:context-menu', (event, items) => {
    return new Promise((resolve) => {
      let settled = false
      const done = (value) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      const template = buildContextMenuTemplate(Array.isArray(items) ? items : [], done)
      const menu = Menu.buildFromTemplate(template)
      const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
      menu.popup({ window: win, callback: () => done(null) })
    })
  })

  ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    return await dialog.showSaveDialog(win, options)
  })

  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    return await dialog.showOpenDialog(win, options)
  })

  ipcMain.handle('app-update:check-manifest', async () => {
    if (isMas) return null
    try {
      const { APP_UPDATE_MANIFEST_URL } = await import('@pear-notes/core/constant.js')
      const res = await fetch(APP_UPDATE_MANIFEST_URL, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return null
      return await res.json()
    } catch (e) {
      console.warn('app-update:check-manifest failed', e.message)
      return null
    }
  })

  ipcMain.handle('shell:open-external', (event, url) => {
    return shell.openExternal(url)
  })

  // Chromium's HTTP cache only. Never clearStorageData here: that would also wipe IndexedDB, and
  // the note thumbnails the sidebar draws live there.
  ipcMain.handle('cache:size', async () => {
    try {
      return await session.defaultSession.getCacheSize()
    } catch {
      return 0
    }
  })

  ipcMain.handle('cache:clear', async () => {
    try {
      await session.defaultSession.clearCache()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('clipboard:write', (event, { text, html } = {}) => {
    if (typeof text !== 'string') return false
    if (typeof html === 'string' && html) clipboard.write({ text, html })
    else clipboard.writeText(text)
    return true
  })
}

function buildContextMenuTemplate(items, onSelect) {
  return items.map((item) => {
    if (item.type === 'separator') return { type: 'separator' }
    const entry = {
      label: item.label,
      enabled: item.enabled !== false
    }
    if (item.role) entry.role = item.role
    if (Array.isArray(item.submenu)) {
      entry.submenu = buildContextMenuTemplate(item.submenu, onSelect)
    } else if (item.id) {
      entry.click = () => onSelect(item.id)
    }
    return entry
  })
}

const lock = app.requestSingleInstanceLock()

if (!lock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media' || permission === 'microphone') {
        callback(true)
        return
      }
      callback(false)
    })

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'media' || permission === 'microphone') return true
      return false
    })

    setupIPC()
    createWindow()
    createTray()
    startWorker()
    watchPowerState()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      } else if (mainWindow) {
        mainWindow.show()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (closeToTray && tray) return
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
    if (powerSaveBlockerId !== null) {
      powerSaveBlocker.stop(powerSaveBlockerId)
      powerSaveBlockerId = null
    }
    if (worker) {
      worker.destroy()
      worker = null
    }
  })
}
