import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { handleWindowControlsIpc } from './window-controls'
import { handleNavigationIpc } from './navigation'
import { handleChangeDownloadPath } from './preferences'
import { handleI18nIpc } from './i18n'
import { getIsQuitting, isTrayEnabled } from './tray'
import { initConfig } from './app-config/init-config'
import { readConfig } from './app-config/config-api'
import { initConfigCache, registerConfigIpc } from './app-config/config-listeners'
import { setupAppInternals } from './setup'
import { registerStatusIpc } from './status-bus'
import { handleAppControlsIpc } from './app-controls'
import { registerDownloadsIpc } from './downloads-ipc'
import { handleDialogIpc } from './dialog'
import { registerJobsIpc } from './jobs-ipc'

function createWindow(): void {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icons', 'icon-256.png')
    : join(__dirname, '../../resources/icons/icon-256.png')
  const cfg = readConfig()
  const useNativeToolbar = Boolean(cfg?.general?.useNativeToolbar)
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: useNativeToolbar ? true : false,
    titleBarStyle:
      process.platform === 'darwin' ? (useNativeToolbar ? 'default' : 'hidden') : undefined,
    ...(process.platform === 'linux' ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (e) => {
    if (!getIsQuitting() && isTrayEnabled()) {
      e.preventDefault()
      mainWindow.hide()
      if (app.dock) app.dock.hide()
    }
    return false
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (is.dev && devUrl) {
    // mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(`${devUrl}/index.html`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      if (!win.isVisible()) win.show()
      win.focus()
    } else {
      createWindow()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  initConfigCache()
  handleDialogIpc()
  handleWindowControlsIpc()
  handleAppControlsIpc()
  handleNavigationIpc()
  handleChangeDownloadPath()
  handleI18nIpc()
  registerConfigIpc()
  registerStatusIpc()
  registerDownloadsIpc()
  registerJobsIpc()
  setupAppInternals()
  initConfig()

  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    const win = BrowserWindow.getAllWindows()[0]
    if (win.isMinimized()) win.restore()
    if (!win.isVisible()) win.show()
    win.focus()
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
