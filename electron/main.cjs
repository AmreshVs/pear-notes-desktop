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
  clipboard,
  nativeTheme,
  Notification
} = require('electron')
const os = require('os')
const path = require('path')
const fs = require('fs')
const PearRuntime = require('pear-runtime')
const secretStore = require('./secretStore.cjs')
const { createVaultKeys } = require('./vaultKeys.cjs')
const { isMac, isLinux } = require('which-runtime')
const { getLocalAiRoot, setupLocalAi, shutdownLocalAi } = require('./localAi.cjs')
const deviceStorage = require('./deviceStorage.cjs')

const pkg = require('../package.json')
const { storeBuild } = require('./storeBuild.cjs')
const appName = pkg.productName ?? pkg.name
// Pinned to the original product name and deliberately not derived from appName:
// the storage directory is where every existing install keeps its notes, keys and
// pairing state, so renaming the app must not move it.
const storageDirName = 'PearNotes'
// Deliberately does NOT consult NODE_ENV: a packaged build launched with
// NODE_ENV=development would otherwise disable webSecurity and open DevTools.
const isDev = !app.isPackaged
const isMas = process.mas === true

const fallbackBuildNumber = String(storeBuild(pkg.version, pkg.buildNumber))

function readInfoPlistString(key) {
  if (!app.isPackaged || !isMac) return null
  try {
    const plistPath = path.join(path.dirname(app.getPath('exe')), '..', 'Info.plist')
    const plist = fs.readFileSync(plistPath, 'utf8')
    const match = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`))
    return match?.[1]?.trim() || null
  } catch {
    return null
  }
}

function getBuildNumber() {
  return readInfoPlistString('CFBundleVersion') ?? fallbackBuildNumber
}

const isMacAppStoreBuild = isMas && readInfoPlistString('PearNotesDistribution') !== 'developer-id'
const isStoreManagedBuild =
  isMacAppStoreBuild || process.windowsStore === true || Boolean(process.env.FLATPAK_ID)

const STARTUP_TASK_ID = 'PearNotesStartup'

function startupTaskStatus(state) {
  return {
    enabled: state === 'enabled' || state === 'enabledByPolicy',
    blockedBy:
      state === 'disabledByUser'
        ? 'user'
        : state === 'disabledByPolicy' || state === 'enabledByPolicy'
          ? 'policy'
          : null
  }
}

let deviceAuth = null
try {
  deviceAuth = require('../native/pear-device-auth')
} catch (e) {
  console.warn('pear-device-auth native module unavailable:', e.message)
}

const usesStartupTask = process.windowsStore === true && deviceAuth !== null
const usesXdgAutostart = process.platform === 'linux' && !process.env.FLATPAK_ID

function xdgAutostartPath() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(configHome, 'autostart', 'pear-notes.desktop')
}

function desktopEntryExec(file) {
  return `"${file.replace(/(["`$\\])/g, '\\$1')}"`.replace(/\\/g, '\\\\')
}

function setXdgAutostart(enabled) {
  const file = xdgAutostartPath()
  if (!enabled) {
    fs.rmSync(file, { force: true })
    return
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const entry = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${appName}`,
    `Exec=${desktopEntryExec(process.env.APPIMAGE || process.execPath)}`,
    'Icon=pear-notes',
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')
  fs.writeFileSync(file, entry)
}

let mainWindow = null
const shownNotifications = new Set()
let worker = null
let tray = null
let closeToTray = true
let isQuitting = false
let powerSaveBlockerId = null
let workerFailureReported = false
let savesFlushed = false
const SAVE_FLUSH_TIMEOUT_MS = 3000

function flushRendererSaves() {
  savesFlushed = true
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed() || !worker || workerFailureReported) {
      resolve()
      return
    }
    const done = () => {
      clearTimeout(timer)
      ipcMain.removeListener('saves-flushed', done)
      resolve()
    }
    const timer = setTimeout(done, SAVE_FLUSH_TIMEOUT_MS)
    ipcMain.on('saves-flushed', done)
    mainWindow.webContents.send('flush-saves')
  })
}

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

const PRIVATE_DIR_MODE = 0o700

function ensureStorageDir() {
  const storagePath = getStoragePath()
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true, mode: PRIVATE_DIR_MODE })
  }
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(storagePath, PRIVATE_DIR_MODE)
    } catch (e) {
      console.warn('[storage] could not restrict the storage folder', e.message)
    }
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

  // The worker runs @pear-notes/core. Re-emitting its stdout here duplicates
  // every backend line into the Electron main process, which on macOS reaches
  // the system console. Keep it for development only.
  if (isDev) {
    worker.stdout.on('data', (data) => {
      console.log('[worker]', data.toString().trim())
    })

    worker.stderr.on('data', (data) => {
      console.error('[worker]', data.toString().trim())
    })
  }

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

let pendingPowerState = null

function sendPowerState(state) {
  // The app outlives its window — closed to tray, or just closed on macOS — and
  // a resume dropped here is not made up for anywhere else. The next renderer
  // boot calls getChore, which relists the blob server but never rechecks the
  // swarm, so the backend keeps whatever connections it held before the machine
  // slept. Latch it for whoever loads next instead.
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (state === 'resume') pendingPowerState = state
    return
  }
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
  // A macOS screen lock does not raise 'suspend', so a long locked session ends
  // with the swarm holding connections the network has already dropped.
  powerMonitor.on('unlock-screen', () => sendPowerState('resume'))
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
    width: clamp(MIN_WINDOW_WIDTH, Math.round(workAreaSize.width * 0.85), MAX_DEFAULT_WINDOW_WIDTH),
    height: clamp(
      MIN_WINDOW_HEIGHT,
      Math.round(workAreaSize.height * 0.85),
      MAX_DEFAULT_WINDOW_HEIGHT
    )
  }
}

const EXTERNAL_URL_SCHEMES = new Set(['https:', 'http:', 'mailto:'])
const FAQ_URL = 'https://amreshvs.github.io/pear-notes/faq/'

function isExternallyOpenable(url) {
  if (typeof url !== 'string' || url.length === 0) return false
  try {
    return EXTERNAL_URL_SCHEMES.has(new URL(url).protocol)
  } catch {
    return false
  }
}

function createWindow() {
  const { width, height } = defaultWindowSize()
  savesFlushed = false

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    backgroundColor: '#1F2430',
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 12, y: 14 } }
      : { autoHideMenuBar: true }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: !isDev,
      devTools: isDev,
      plugins: true,
      pdfViewer: true
    }
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // The window holds the backend bridge and the vault key, so a navigation away
  // from the bundled app would hand a remote page those. Never let one happen:
  // window.open goes to the OS browser (allowed schemes only) and in-place
  // navigation is refused outright.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternallyOpenable(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable || !params.misspelledWord) return
    mainWindow?.webContents.send('ui:spelling-context', {
      word: params.misspelledWord,
      suggestions: params.dictionarySuggestions.slice(0, 5)
    })
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault()
      if (isExternallyOpenable(url)) shell.openExternal(url)
    }
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && closeToTray && tray) {
      event.preventDefault()
      mainWindow.hide()
      return
    }
    if (savesFlushed) return
    event.preventDefault()
    flushRendererSaves().then(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  watchWindowActivity(mainWindow)
}

function setAppMenu() {
  const developerItems = isDev
    ? [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' }
      ]
    : []
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        ...developerItems,
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [{ label: 'Help & FAQ', click: () => shell.openExternal(FAQ_URL) }]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
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
      click: showMainWindow
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
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      showMainWindow()
    }
  })
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function setupIPC() {
  // Pulled by the renderer once its listener is live, rather than pushed at a
  // window that may not have finished loading yet.
  ipcMain.handle('power-state:pending', () => {
    const state = pendingPowerState
    pendingPowerState = null
    return state
  })

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

  // Sync, like the other boot-time reads next to it: the renderer needs the
  // vault key and its entropy before it can start the backend at all.
  ipcMain.on('app:fatal-error', (event, { title, message } = {}) => {
    if (!title || !message) return
    dialog.showErrorBox(title, message)
  })

  // LEGACY(hyperdb-migration): see docs/HYPERDB-VIEW-MIGRATION-PLAN-2026-09-23.md section 8
  ipcMain.handle('app:legacy-vault', async (event, texts = {}) => {
    const { title, message, quitLabel, startFreshLabel } = texts
    const owner = BrowserWindow.fromWebContents(event.sender)
    const options = {
      type: 'warning',
      title,
      message: title,
      detail: message,
      buttons: [quitLabel, startFreshLabel],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    }
    const { response } = owner
      ? await dialog.showMessageBox(owner, options)
      : await dialog.showMessageBox(options)
    if (response === 1) return 'start-fresh'
    app.quit()
    return 'quit'
  })

  const vaultKeys = createVaultKeys({ getStoragePath, getAppDir, isDev })

  ipcMain.on('vault-key:get', (event) => {
    event.returnValue = vaultKeys.getDbEncryptionKey()
  })

  ipcMain.on('vault-key:set', (event, key) => {
    event.returnValue = vaultKeys.setDbEncryptionKey(key)
  })

  ipcMain.on('vault-key:entropy', (event) => {
    event.returnValue = vaultKeys.getVaultEntropy()
  })

  ipcMain.on('vault-key:delete', (event) => {
    vaultKeys.deleteDbEncryptionKey()
    event.returnValue = true
  })

  ipcMain.on('get-device-name', (event) => {
    event.returnValue = getDeviceName()
  })

  ipcMain.on('get-app-flags', (event) => {
    event.returnValue = {
      isMas,
      buildNumber: getBuildNumber(),
      keyringMissing: process.platform === 'linux' && !secretStore.isAvailable()
    }
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

  ipcMain.on('native-theme:set', (event, theme) => {
    nativeTheme.themeSource = theme === 'light' || theme === 'dark' ? theme : 'system'
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

  ipcMain.handle('login-item:set', async (event, enabled) => {
    if (usesStartupTask) {
      const method = enabled === true ? 'startupTaskEnable' : 'startupTaskDisable'
      return startupTaskStatus(await deviceAuth[method](STARTUP_TASK_ID))
    }
    if (usesXdgAutostart) {
      try {
        setXdgAutostart(enabled === true)
      } catch (err) {
        console.error('[login-item] could not update autostart entry', err)
      }
      return { enabled: fs.existsSync(xdgAutostartPath()), blockedBy: null }
    }
    try {
      app.setLoginItemSettings({ openAtLogin: enabled === true })
    } catch (err) {
      console.error('[login-item] could not update', err)
    }
    return { enabled: app.getLoginItemSettings().openAtLogin === true, blockedBy: null }
  })

  ipcMain.handle('login-item:get', async () => {
    if (usesStartupTask)
      return startupTaskStatus(await deviceAuth.startupTaskState(STARTUP_TASK_ID))
    if (usesXdgAutostart) return { enabled: fs.existsSync(xdgAutostartPath()), blockedBy: null }
    return { enabled: app.getLoginItemSettings().openAtLogin === true, blockedBy: null }
  })

  ipcMain.handle('login-item:open-system-settings', () => {
    if (process.platform === 'win32') shell.openExternal('ms-settings:startupapps')
  })

  ipcMain.handle('ui:notify', (_event, payload) => {
    const { title, body, noteKey } = payload ?? {}
    if (!Notification.isSupported() || typeof title !== 'string') return
    const notification = new Notification({
      title: title.slice(0, 120),
      body: String(body ?? '').slice(0, 200)
    })
    shownNotifications.add(notification)
    notification.on('close', () => shownNotifications.delete(notification))
    notification.on('click', () => {
      shownNotifications.delete(notification)
      if (!mainWindow) return
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      if (typeof noteKey === 'string') mainWindow.webContents.send('ui:open-note', noteKey)
    })
    notification.show()
  })

  ipcMain.handle('ui:spelling-replace', (event, word) => {
    if (typeof word === 'string' && word) event.sender.replaceMisspelling(word)
  })

  ipcMain.handle('ui:spelling-add', (event, word) => {
    if (typeof word === 'string' && word) event.sender.session.addWordToSpellCheckerDictionary(word)
  })

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

  ipcMain.handle('dialog:saveTextFile', async (event, { defaultPath, filters, text } = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    const result = await dialog.showSaveDialog(win, { defaultPath, filters })
    if (result.canceled || !result.filePath) return { canceled: true, filePath: null }
    await fs.promises.writeFile(result.filePath, String(text ?? ''), 'utf-8')
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    return await dialog.showOpenDialog(win, options)
  })

  ipcMain.handle('app-update:check-manifest', async () => {
    if (isStoreManagedBuild) return null
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
    // The URL comes from the renderer, which renders user-authored note HTML.
    // Without an allowlist a crafted link could reach file:, smb: or a custom
    // scheme registered by another installed app.
    if (!isExternallyOpenable(url)) {
      console.warn('shell:open-external refused a disallowed URL')
      return false
    }
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

  ipcMain.handle('storage:device-usage', async () => {
    try {
      const storagePath = getStoragePath()
      return await deviceStorage.measureDeviceStorage({
        storagePath,
        aiRoot: getLocalAiRoot(storagePath),
        userData: app.getPath('userData')
      })
    } catch (err) {
      console.error('[storage] device usage failed', err)
      return null
    }
  })

  ipcMain.handle('storage:delete-old-vaults', async () => {
    try {
      await deviceStorage.deleteOldVaults(getStoragePath())
      return true
    } catch (err) {
      console.error('[storage] deleting old vaults failed', err)
      return false
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
    if (typeof item.checked === 'boolean') {
      entry.type = 'checkbox'
      entry.checked = item.checked
    }
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
    if (app.isReady()) showMainWindow()
  })

  app.whenReady().then(async () => {
    session.defaultSession.clearCache().catch(() => {})
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

    setAppMenu()
    setupIPC()
    setupLocalAi({ getStoragePath, isMas })
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

  app.on('before-quit', (event) => {
    isQuitting = true
    if (!savesFlushed) {
      event.preventDefault()
      flushRendererSaves().then(() => app.quit())
      return
    }
    if (powerSaveBlockerId !== null) {
      powerSaveBlocker.stop(powerSaveBlockerId)
      powerSaveBlockerId = null
    }
    shutdownLocalAi()
    if (worker) {
      worker.destroy()
      worker = null
    }
  })
}
