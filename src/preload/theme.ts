import { ipcRenderer } from 'electron'
import { DATA } from '../shared/data'
import { APP_CONFIG_CHANNELS, AppConfig } from '../shared/ipc/app-config'

function applyThemeToRoot(themeName: string, isDark: boolean): void {
  const apply = (root: HTMLElement): void => {
    root.setAttribute('data-theme-transition', 'off')
    root.classList.toggle('dark', isDark)
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')
    root.setAttribute('data-theme-name', themeName)
    setTimeout(() => root.removeAttribute('data-theme-transition'), 0)
  }

  // Try immediate
  const rootNow = document.documentElement || document.getElementsByTagName('html')[0]
  if (rootNow) {
    apply(rootNow)
    return
  }

  // Attach the earliest possible listeners
  const tryApply = (): void => {
    const root = document.documentElement || document.getElementsByTagName('html')[0]
    if (root) {
      apply(root)
      document.removeEventListener('readystatechange', tryApply, true)
      window.removeEventListener('DOMContentLoaded', tryApply, true)
    }
  }

  // Ready states change from 'loading' -> 'interactive' -> 'complete'
  document.addEventListener('readystatechange', tryApply, true)
  window.addEventListener('DOMContentLoaded', tryApply, true)
}

export function applyInitialTheme(): void {
  try {
    // get initial theme name from main synchronously (may be system|light|dark|custom)
    const themeName = safeGetConfigThemeName()
    const mode = resolveThemeMode(themeName)
    const systemDark =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false
    const isDark = mode === 'dark' || (mode === 'system' && systemDark)

    applyThemeToRoot(themeName, isDark)
  } catch {
    // no-op
  }
}

export function startThemeWatcher(): void {
  // React to config updates
  ipcRenderer.on(APP_CONFIG_CHANNELS.UPDATED, (_e, cfg: AppConfig) => {
    try {
      const themeName = cfg?.general?.theme || 'system'
      const mode = resolveThemeMode(themeName)
      const systemDark =
        typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false
      const isDark = mode === 'dark' || (mode === 'system' && systemDark)
      applyThemeToRoot(themeName, isDark)
      setupSystemWatcherIfNeeded(themeName)
    } catch {
      // no-op
    }
  })

  // Also listen to system changes when theme is system
  setupSystemWatcherIfNeeded(safeGetConfigThemeName())
}

let systemWatcher: MediaQueryList | null = null
function setupSystemWatcherIfNeeded(themeName: string): void {
  if (systemWatcher) {
    try {
      systemWatcher.removeEventListener('change', onSystemChange)
    } catch {
      // no-op
    }
    systemWatcher = null
  }
  if (themeName !== 'system') return
  if (!(typeof window !== 'undefined' && window.matchMedia)) return
  systemWatcher = window.matchMedia('(prefers-color-scheme: dark)')
  try {
    systemWatcher.addEventListener('change', onSystemChange)
  } catch {
    // no-op
  }
}

function onSystemChange(): void {
  const themeName = safeGetConfigThemeName()
  const mode = resolveThemeMode(themeName)
  const systemDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  const isDark = mode === 'dark' || (mode === 'system' && systemDark)
  applyThemeToRoot(themeName, isDark)
}

function safeGetConfigThemeName(): string {
  try {
    const v = ipcRenderer.sendSync(APP_CONFIG_CHANNELS.GET) as AppConfig
    const theme = v.general.theme
    return typeof theme === 'string' && theme ? theme : 'system'
  } catch {
    return 'system'
  }
}

function resolveThemeMode(name: string): 'light' | 'dark' | 'system' {
  const entry = Array.isArray(DATA?.themes) ? DATA.themes.find((t) => t.value === name) : null
  const mode = entry?.mode as 'light' | 'dark' | undefined
  if (name === 'system' || !mode) return 'system'
  return mode
}

/**
 * @description
 * This function initializes theme on the render processes
 */
export function initTheme(): void {
  applyInitialTheme()
  startThemeWatcher()
}
