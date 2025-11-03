// TODO: delete if not used
import { DATA } from '@root/shared/data'

let mql: MediaQueryList | null = null
let mqlHandler: ((e: MediaQueryListEvent) => void) | null = null

function removeThemeClasses(): void {
  const root = document.documentElement
  const themeValues = DATA.themes.map((t) => t.value)
  themeValues.forEach((v) => root.classList.remove(v))
  root.classList.remove('dark', 'light')
}

export function applySystemTheme(): void {
  const apply = (isDark: boolean): void => {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }
  if (!mql) mql = window.matchMedia('(prefers-color-scheme: dark)')
  apply(mql.matches)
  if (!mqlHandler) {
    mqlHandler = (e: MediaQueryListEvent) => apply(e.matches)
    mql.addEventListener('change', mqlHandler)
  }
}

export function teardownSystemTheme(): void {
  if (mql && mqlHandler) {
    mql.removeEventListener('change', mqlHandler)
  }
  mqlHandler = null
}

export function applyThemeValue(value: string): void {
  if (!value) return
  if (value === 'system') {
    teardownSystemTheme()
    removeThemeClasses()
    applySystemTheme()
    return
  }
  teardownSystemTheme()
  removeThemeClasses()
  const root = document.documentElement
  if (value === 'dark') {
    root.classList.add('dark')
    return
  }
  if (value === 'light') {
    return
  }
  const theme = DATA.themes.find((t) => t.value === value)
  if (theme?.mode === 'dark') root.classList.add('dark')
  else if (theme?.mode === 'light') root.classList.remove('dark')
  root.classList.add(value)
}
