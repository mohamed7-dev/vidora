import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is, platform } from '@electron-toolkit/utils'
import { handleWindowControlsIpc } from './window-controls'
import { initChangeDownloadPathIpc, initChangeYtdlpConfigPathIpc } from './preferences'
import { handleI18nIpc } from './i18n'
import { getIsQuitting, isTrayEnabled } from './tray'
import { initConfig } from './app-config/init-config'
import { readConfig } from './app-config/config-api'
import { initConfigCache, registerConfigIpc } from './app-config/config-listeners'
import { setupAppInternals } from './setup'
import { registerStatusIpc } from './status-bus'
import { handleAppControlsIpc } from './app-controls'
import { registerJobsIpc, pauseAllIncompletedJobs } from './jobs-ipc'
import { registerYtdlpIpc } from './ytdlp'

function createWindow(): void {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icons', 'icon-256.png')
    : join(__dirname, '../../resources/icons/icon-256.png')
  const cfg = readConfig()
  const useNativeToolbar = Boolean(cfg.general.useNativeToolbar)
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: useNativeToolbar ? true : false,
    titleBarStyle: platform.isMacOS ? (useNativeToolbar ? 'default' : 'hidden') : undefined,
    ...(platform.isLinux ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (e) => {
    // if tray is enabled, then hide the window instead of quitting
    // unless quit action is triggered from the tray
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
  // init config cache and config
  initConfigCache()
  initConfig()
  // setup app internals
  setupAppInternals()
  // register config file related ipc
  registerConfigIpc()
  // init window controls ipc
  handleWindowControlsIpc()
  // init app controls ipc
  handleAppControlsIpc()
  // init download dir path change ipc
  initChangeDownloadPathIpc()
  // init config file path change ipc
  initChangeYtdlpConfigPathIpc()
  // init i18n ipc
  handleI18nIpc()
  // init status ipc
  registerStatusIpc()
  // init ytdlp ipc
  registerYtdlpIpc()
  // init download jobs ipc
  registerJobsIpc()

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
  if (!platform.isMacOS) {
    app.quit()
  }
})

// Ensure incomplete jobs are paused on app shutdown
app.on('before-quit', () => {
  try {
    pauseAllIncompletedJobs()
  } catch {
    // swallow errors to not block quit
  }
})
