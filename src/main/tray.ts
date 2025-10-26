import { BrowserWindow, Menu, Tray, nativeImage, app, clipboard } from 'electron'
import icon256 from '../../resources/icons/icon-256.png?asset'
import icon16 from '../../resources/icons/icon-16.png?asset'
import { platform } from '@electron-toolkit/utils'

function getIconPath(): string {
  if (platform.isMacOS) {
    return icon16 as unknown as string
  } else {
    return icon256 as unknown as string
  }
}

function getWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0]
}

// Functional style module state
let trayRef: Tray | null = null
let quitting = false
let enabled = false

function init(): void {
  if (trayRef) return
  const image = nativeImage.createFromPath(getIconPath())
  trayRef = new Tray(image)
  trayRef.setToolTip(app.name)
  const menu = Menu.buildFromTemplate([
    {
      label: 'Open App',
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
      label: 'Paste video link',
      click: () => {
        const text = clipboard.readText()
        const win = getWindow()
        if (!win) return
        win.show()
        if (app.dock) app.dock.show()
        win.webContents.send('link', text)
      }
    },
    {
      label: 'Quit',
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
