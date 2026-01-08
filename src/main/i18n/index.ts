import { ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { is } from '@electron-toolkit/utils'
import {
  LoadedLocaleDictPayload,
  LocaleDict,
  setLoadedLanguage,
  setLocale
} from '../../shared/i18n/i18n'
import { readConfig } from '../app-config/config-api'
import { USER_PREF_CHANNELS } from '../../shared/ipc/user-pref'
import { broadcastToAllWindows } from '../lib'
import { LocaleCode } from '../../shared/i18n/config'

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

async function loadDict(locale: LocaleCode): Promise<LocaleDict> {
  try {
    const dict = await readLocaleFile(locale)
    setLocale(locale)
    setLoadedLanguage(dict)
    return dict
  } catch {
    const dict = await readLocaleFile('en')
    setLocale('en')
    setLoadedLanguage(dict)
    return dict
  }
}

/**
 * @description
 * This function performs a side-effect for loading the dictionary, and sending it to all renderer processes.
 */
export async function loadAndBroadcastDict(locale: LocaleCode): Promise<void> {
  const dict = await loadDict(locale)
  broadcastToAllWindows(USER_PREF_CHANNELS.LOCALE.LOADED, {
    locale,
    dict
  } satisfies LoadedLocaleDictPayload)
}

function setupIPC(): void {
  ipcMain.handle(USER_PREF_CHANNELS.LOCALE.LOAD, async (_e, locale?: LocaleCode) => {
    const config = readConfig()
    const dict = await loadDict(locale ?? (config.general.language as LocaleCode))
    return dict
  })
}

/**
 * @description
 * This function initializes i18n in the main as well as the renderer processes.
 */
export async function initI18n(locale: LocaleCode): Promise<void> {
  await loadAndBroadcastDict(locale)
  setupIPC()
}
