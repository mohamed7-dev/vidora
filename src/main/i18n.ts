import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { is } from '@electron-toolkit/utils'
import { EVENTS } from '../shared/events'

const SETTINGS_FILE = 'settings.json'

function getUserSettingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE)
}

async function readSettings(): Promise<Record<string, unknown>> {
  try {
    const p = getUserSettingsPath()
    const txt = await fs.readFile(p, 'utf-8')
    return JSON.parse(txt)
  } catch {
    return {}
  }
}

async function writeSettings(obj: Record<string, unknown>): Promise<void> {
  const p = getUserSettingsPath()
  await fs.mkdir(app.getPath('userData'), { recursive: true }).catch(() => {})
  await fs.writeFile(p, JSON.stringify(obj, null, 2), 'utf-8')
}

function getLocalesDir(): string {
  // In dev, locales live in ../../resources/locales relative to compiled main dir
  // In prod, locales are copied to resources/locales
  const devPath = join(__dirname, '../../resources/locales')
  const prodPath = join(process.resourcesPath, 'locales')
  return is.dev ? devPath : prodPath
}

async function readLocaleFile(locale: string): Promise<Record<string, unknown>> {
  const file = join(getLocalesDir(), `${locale}.json`)
  const txt = await fs.readFile(file, 'utf-8')
  return JSON.parse(txt)
}

export function handleI18n(): void {
  ipcMain.handle(EVENTS.I18N.GET_LOCALE, async () => {
    const settings = await readSettings()
    const saved = (settings['language'] as string | undefined) || ''
    if (saved) return saved
    const sys = app.getLocale().split('-')[0]
    return sys || 'en'
  })

  ipcMain.handle(EVENTS.I18N.LOAD_LOCALE, async (_e, locale: string) => {
    try {
      const dict = await readLocaleFile(locale)
      return dict
    } catch {
      // fallback to en if not found
      const dict = await readLocaleFile('en')
      return dict
    }
  })

  ipcMain.handle(EVENTS.I18N.SET_LOCALE, async (event, locale: string) => {
    const settings = await readSettings()
    settings['language'] = locale
    await writeSettings(settings)

    // Option B: Relaunch app with --lang to set system-wide locale
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      // Inform renderers before relaunch (optional)
      BrowserWindow.getAllWindows().forEach((w) =>
        w.webContents.send(EVENTS.I18N.LOCALE_CHANGED, locale)
      )
    }

    app.relaunch({ args: [...process.argv.slice(1), `--lang=${locale}`] })
    app.exit(0)
  })
}
