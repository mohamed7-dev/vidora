let loadedLanguage: LocaleDict = {}
let currentLocale = 'en'

export interface LoadedLocaleDictPayload {
  dict: LocaleDict
  locale: string
}

export type LocaleDict = Record<string, unknown>

function deepGet(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj
  for (const seg of path) {
    if (cur && typeof cur === 'object' && seg in (cur as LocaleDict)) {
      cur = (cur as LocaleDict)[seg]
    } else {
      return undefined
    }
  }
  return cur
}

/**
 * @description
 * This function is used to translate phrases
 */
export function t(phrase: string): string {
  const val = deepGet(loadedLanguage, phrase.split('.'))
  return typeof val === 'string' ? val : phrase
}

export function setLocale(locale: string): void {
  currentLocale = locale
}

export function getLocale(): string {
  return currentLocale
}

export function setLoadedLanguage(language: LocaleDict): void {
  loadedLanguage = language
}

export function getLoadedLanguage(): LocaleDict {
  return loadedLanguage
}
