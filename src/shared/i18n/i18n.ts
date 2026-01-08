import { LocaleCode } from './config'

export type LocaleDict = Record<string, unknown>

let loadedLanguage: LocaleDict = {}
let currentLocale: LocaleCode = 'en'

export interface LoadedLocaleDictPayload {
  dict: LocaleDict
  locale: LocaleCode
}

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

function translate(phrase: string): string {
  const val = deepGet(loadedLanguage, phrase.split('.'))
  return typeof val === 'string' ? val : phrase
}

/**
 * @description
 * This function / tag is used to translate phrases
 */
export function t(phrase: string): string
export function t(strings: TemplateStringsArray): string
export function t(arg: string | TemplateStringsArray): string {
  const phrase = Array.isArray(arg) ? (arg[0] ?? '') : arg
  return translate(phrase)
}

export function setLocale(locale: LocaleCode): void {
  currentLocale = locale
}

export function getLocale(): LocaleCode {
  return currentLocale
}

export function setLoadedLanguage(language: LocaleDict): void {
  loadedLanguage = language
}

export function getLoadedLanguage(): LocaleDict {
  return loadedLanguage
}
