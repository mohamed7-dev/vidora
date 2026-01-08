export type LocaleCode = 'en' | 'ar'

export interface LocaleConfig {
  locales: LocaleCode[]
  defaultLocale: LocaleCode
}

export const LOCALE_CONFIG: LocaleConfig = {
  locales: ['en', 'ar'],
  defaultLocale: 'en'
}

export function isSupportedLocale(locale: string): locale is LocaleCode {
  return (LOCALE_CONFIG.locales as string[]).includes(locale)
}
