import { ipcRenderer } from 'electron'
import { EVENTS } from '../shared/events'

// Custom APIs for renderer
let loadedLanguage: Record<string, unknown> = {}
let currentLocale = 'en'

function deepGet(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj
  for (const seg of path) {
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg]
    } else {
      return undefined
    }
  }
  return cur
}

export function t(phrase: string): string {
  const val = deepGet(loadedLanguage, phrase.split('.'))
  return typeof val === 'string' ? val : phrase
}

export async function initI18nLoader(): Promise<void> {
  try {
    // Prefer user-selected language in localStorage if present
    const stored = globalThis.localStorage?.getItem('language')
    if (stored) currentLocale = stored
  } catch {
    // ignore if localStorage not available
  }
  try {
    if (!currentLocale) {
      currentLocale = await ipcRenderer.invoke(EVENTS.I18N.GET_LOCALE)
    }
    loadedLanguage = await ipcRenderer.invoke(EVENTS.I18N.LOAD_LOCALE, currentLocale)
  } catch {
    // fallback: try English
    try {
      loadedLanguage = await ipcRenderer.invoke(EVENTS.I18N.LOAD_LOCALE, 'en')
      currentLocale = 'en'
    } catch {
      loadedLanguage = {}
    }
  }
}

export function setLocale(locale: string): void {
  currentLocale = locale
}

export function getLocale(): string {
  return currentLocale
}

export function setLoadedLanguage(language: Record<string, unknown>): void {
  loadedLanguage = language
}

export function getLoadedLanguage(): Record<string, unknown> {
  return loadedLanguage
}

// Initialize i18n loader and keep cache in sync
void initI18nLoader()
ipcRenderer.on(EVENTS.I18N.LOCALE_CHANGED, async (_e, locale: string) => {
  try {
    currentLocale = locale
    loadedLanguage = await ipcRenderer.invoke(EVENTS.I18N.LOAD_LOCALE, currentLocale)
    try {
      globalThis.localStorage?.setItem('language', currentLocale)
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
})
