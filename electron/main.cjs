const { app, BrowserWindow, ipcMain } = require('electron')
const os = require('os')
const path = require('path')
const fs = require('fs')
const PearRuntime = require('pear-runtime')
const { isMac, isLinux } = require('which-runtime')

const pkg = require('../package.json')
const appName = pkg.productName ?? pkg.name
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let worker = null

function getStoragePath () {
  if (isDev) {
    return path.join(os.tmpdir(), 'pear', appName)
  }
  const isSnap = !!process.env.SNAP_USER_COMMON
  const linuxConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return isMac
    ? path.join(os.homedir(), 'Library', 'Application Support', appName)
    : isLinux
      ? isSnap
        ? path.join(process.env.SNAP_USER_COMMON, appName)
        : path.join(linuxConfigHome, appName)
      : path.join(os.homedir(), 'AppData', 'Roaming', appName)
}

function getAppDir () {
  return isDev ? path.resolve(__dirname, '..') : path.dirname(app.getPath('exe'))
}

function ensureStorageDir () {
  const storagePath = getStoragePath()
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true })
  }
  return storagePath
}

function startWorker () {
  const workerPath = require.resolve('../workers/main.js')
  const storagePath = ensureStorageDir()

  worker = PearRuntime.run(workerPath, [storagePath])

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
  })
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 1280,
    backgroundColor: '#1F2430',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: !isDev
    }
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function setupIPC () {
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

  ipcMain.on('app-reload', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload()
    }
  })

  ipcMain.on('app-quit', () => {
    app.quit()
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

  app.whenReady().then(() => {
    setupIPC()
    createWindow()
    startWorker()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    if (worker) {
      worker.destroy()
      worker = null
    }
  })
}
