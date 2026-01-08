import { BrowserWindow, Menu, Tray, nativeImage, app, clipboard } from 'electron'
import { join } from 'node:path'
import { platform } from '@electron-toolkit/utils'
import { t } from '../../shared/i18n/i18n'
import { PASTE_LINK_CHANNELS } from '../../shared/ipc/paste-link'
import { AppConfig } from '../../shared/ipc/app-config'

function getIconPath(): string {
  const base = app.isPackaged
    ? join(process.resourcesPath, 'icons')
    : join(__dirname, '../../resources/icons')
  const file = platform.isMacOS ? 'icon-16.png' : 'icon-256.png'
  return join(base, file)
}

function getWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0]
}

// Functional style module state
let trayRef: Tray | null = null
let quitting = false
let enabled = false

async function init(): Promise<void> {
  if (trayRef) return
  const image = nativeImage.createFromPath(getIconPath())
  trayRef = new Tray(image)
  trayRef.setToolTip(app.name)
  const menu = Menu.buildFromTemplate([
    {
      label: t`Open App`,
      click: () => {
        const win = getWindow()
        if (win) {
          if (win.isMinimized()) win.restore()
          win.show()
          win.focus()
        }
        if (app.dock) app.dock.show()
      }
    },
    {
      label: t`Paste media url`,
      click: () => {
        const text = clipboard.readText()
        const win = getWindow()
        if (!win) return
        win.show()
        if (app.dock) app.dock.show()
        win.webContents.send(PASTE_LINK_CHANNELS.PASTED, text)
      }
    },
    {
      label: t`Quit`,
      role: 'quit',
      click: () => {
        quitting = true
        app.quit()
      }
    }
  ])
  trayRef.setContextMenu(menu)
  trayRef.on('click', () => {
    const win = getWindow()
    if (win) {
      if (win.isVisible()) win.hide()
      else win.show()
    }
    if (app.dock) app.dock.show()
  })
}

function destroy(): void {
  if (trayRef) {
    trayRef.destroy()
    trayRef = null
  }
}

export function useTray(value: boolean): void {
  if (value) {
    init()
  } else if (!value) {
    destroy()
  }
  enabled = value
}

export function getIsQuitting(): boolean {
  return quitting
}

export function isTrayEnabled(): boolean {
  return enabled
}

/**
 * @description
 * This function initializes tray based on the option configured by the user
 */
export function initTray(closeToTray: AppConfig['general']['closeToTray']): void {
  // sync tray from config
  useTray(closeToTray)
}
