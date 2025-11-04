import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { is } from '@electron-toolkit/utils'
import { EVENTS } from '../shared/events'

function getLocalesDir(): string {
  // In dev, locales live in ../../resources/locales relative to compiled main dir
  const devPath = join(__dirname, '../../resources/locales')
  // In prod, locales are copied to resources/locales
  const prodPath = join(process.resourcesPath, 'locales')
  return is.dev ? devPath : prodPath
}

/**
 * @description
 * This function reads a locale file and returns its contents as a JSON object.
 */
export async function readLocaleFile(locale: string): Promise<Record<string, unknown>> {
  const file = join(getLocalesDir(), `${locale}.json`)
  const txt = await fs.readFile(file, 'utf-8')
  return JSON.parse(txt)
}

/**
 * @description
 * This function performs a side-effect of updating the locale in all windows.
 */
export function updateBrowserLocale(locale: string): void {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send(EVENTS.I18N.LOCALE_CHANGED, locale)
  )
}

/**
 * @description
 * This function registers the ipc listeners for i18n.
 */
export function handleI18nIpc(): void {
  ipcMain.handle(EVENTS.I18N.LOAD_LOCALE, async (_e, locale: string) => {
    try {
      const dict = await readLocaleFile(locale)
      return dict
    } catch {
      const dict = await readLocaleFile('en')
      return dict
    }
  })
}
