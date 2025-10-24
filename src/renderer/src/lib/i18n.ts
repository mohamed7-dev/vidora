import { storage } from './storage'

export type Locale = 'en' | 'ar'

type Dict = Record<string, unknown>

const LANG_KEY = 'language'
const DIR_KEY = 'direction'

const emitter = new EventTarget()

let externalDict: Dict | null = null

function isRtl(lang: Locale): boolean {
  return lang === 'ar'
}

// keep
function applyHtmlAttrs(lang: Locale): void {
  const dir = isRtl(lang) ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('lang', lang)
  document.documentElement.setAttribute('dir', dir)
  storage.set(LANG_KEY, lang)
  storage.set(DIR_KEY, dir)
}

// keep
export function getLanguage(): Locale {
  const lang = storage.get(LANG_KEY) as Locale | null
  return lang || 'en'
}

// keep
export function setLanguage(lang: Locale): void {
  // Persist only; do not update UI immediately. Changes will apply after restart.
  storage.set(LANG_KEY, lang)
}

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

export function t(key: string): string {
  const dict = externalDict || {}
  const parts = key.split('.')
  const val = deepGet(dict, parts)
  return typeof val === 'string' ? val : key
}

export function onLanguageChange(cb: (lang: Locale) => void): () => void {
  const handler = (e: Event): void => cb((e as CustomEvent).detail.lang as Locale)
  emitter.addEventListener('languagechange', handler as EventListener)
  return () => emitter.removeEventListener('languagechange', handler as EventListener)
}

export function initI18n(): void {
  const current = getLanguage()
  applyHtmlAttrs(current)
  // Try to load external locale via preload API if available
  const api = window.api?.i18n
  if (api?.loadLocale && api?.getLocale) {
    api
      .getLocale()
      .then((loc) => (typeof loc === 'string' ? loc : current))
      .then((loc) => api.loadLocale!(loc))
      .then((dict) => {
        externalDict = dict as Dict
        emitter.dispatchEvent(
          new CustomEvent('languagechange', { detail: { lang: getLanguage() } })
        )
      })
      .catch(() => {})
  }
}

export async function restartAppForCurrentLocale(): Promise<void> {
  const api = window.api?.i18n
  if (api?.setLocale) {
    await api.setLocale(getLanguage())
  }
}
