import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { is } from '@electron-toolkit/utils'
import { LoadedLocaleDictPayload, LocaleDict } from '../../shared/i18n'
import { AppConfig } from '../../shared/types'
import { readConfig } from '../app-config/config-api'
import { USER_PREF_CHANNELS } from '../../shared/ipc/user-pref'

const dictionariesCache: Record<string, LocaleDict> = {}

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
export async function readLocaleFile(locale: string): Promise<LocaleDict> {
  const file = join(getLocalesDir(), `${locale}.json`)
  const txt = await fs.readFile(file, 'utf-8')
  return JSON.parse(txt)
}

async function loadDict(locale: string): Promise<LocaleDict> {
  // if (dictionariesCache[locale]) return dictionariesCache[locale]
  try {
    const dict = await readLocaleFile(locale)
    dictionariesCache[locale] = dict
    return dict
  } catch {
    const dict = await readLocaleFile('en')
    dictionariesCache['en'] = dict
    return dict
  }
}

/**
 * @description
 * This function performs a side-effect for loading the dictionary, and sending it to all renderer processes.
 */
export async function loadAndBroadcastDict(locale: string): Promise<void> {
  const dict = await loadDict(locale)

  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send(USER_PREF_CHANNELS.LOCALE.LOADED, {
      locale,
      dict
    } satisfies LoadedLocaleDictPayload)
  )
}
function setupIPC(): void {
  ipcMain.handle(USER_PREF_CHANNELS.LOCALE.LOAD, async (_e, locale?: string) => {
    const config = readConfig()
    const dict = await loadDict(locale ?? config.general.language)
    return dict
  })
}

/**
 * @description
 * This function initializes i18n in the main as well as the renderer processes.
 */
export async function initI18n(locale: AppConfig['general']['language']): Promise<void> {
  await loadAndBroadcastDict(locale)
  setupIPC()
}
