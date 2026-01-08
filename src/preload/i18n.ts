import { ipcRenderer } from 'electron'
import {
  LoadedLocaleDictPayload,
  LocaleDict,
  setLoadedLanguage,
  setLocale
} from '../shared/i18n/i18n'
import { USER_PREF_CHANNELS } from '../shared/ipc/user-pref'
import { LocaleCode } from '../shared/i18n/config'

async function initI18nLoader(): Promise<void> {
  let currentLocale: LocaleCode = 'en'
  let loadedLanguage: LocaleDict = {}

  try {
    loadedLanguage = await ipcRenderer.invoke(USER_PREF_CHANNELS.LOCALE.LOAD)
  } catch {
    // fallback: try English
    try {
      loadedLanguage = await ipcRenderer.invoke(USER_PREF_CHANNELS.LOCALE.LOAD, 'en')
      currentLocale = 'en'
    } catch {
      loadedLanguage = {}
    }
  }
  setLocale(currentLocale)
  setLoadedLanguage(loadedLanguage)
}

/**
 * @description
 * This function initializes i18n, this will load the current language and dictionary to the memory based on
 * user configuration
 */
export function initI18n(): void {
  // edge case(in dev): when reloading window we lose locale and dictionary since they were in memory
  // so we have to manually invoke get locale event to get each time
  initI18nLoader()

  ipcRenderer.on(USER_PREF_CHANNELS.LOCALE.LOADED, async (_e, info: LoadedLocaleDictPayload) => {
    setLocale(info.locale)
    setLoadedLanguage(info.dict)
  })
}
