import { BrowserWindow, Menu, Tray, nativeImage, app, clipboard } from 'electron'
import path from 'node:path'
import { platform } from '@electron-toolkit/utils'
import { AppConfig } from '../../shared/types'
import { t } from '../../shared/i18n'
import { EVENTS } from '../../shared/events'

function getIconPath(): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'icons')
    : path.join(__dirname, '../../../resources/icons')
  const file = platform.isMacOS ? 'icon-16.png' : 'icon-256.png'
  return path.join(base, file)
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
      label: t('open app'),
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
      label: t('paste media link'),
      click: () => {
        const text = clipboard.readText()
        const win = getWindow()
        if (!win) return
        win.show()
        if (app.dock) app.dock.show()
        win.webContents.send(EVENTS.PASTE_LINK.PASTED, text)
      }
    },
    {
      label: t('quit'),
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
