import { ipcRenderer } from 'electron'
import { EVENTS } from '../shared/events'
import { LoadedLocaleDictPayload, LocaleDict, setLoadedLanguage, setLocale } from '../shared/i18n'

async function initI18nLoader(): Promise<void> {
  let currentLocale = ''
  let loadedLanguage: LocaleDict = {}

  try {
    loadedLanguage = await ipcRenderer.invoke(EVENTS.PREFERENCES.LOCALE.LOAD)
  } catch {
    // fallback: try English
    try {
      loadedLanguage = await ipcRenderer.invoke(EVENTS.PREFERENCES.LOCALE.LOAD, 'en')
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

  ipcRenderer.on(EVENTS.PREFERENCES.LOCALE.LOADED, async (_e, info: LoadedLocaleDictPayload) => {
    setLocale(info.locale)
    setLoadedLanguage(info.dict)
  })
}
