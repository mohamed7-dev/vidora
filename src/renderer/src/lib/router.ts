import { routes } from './routes'

export const ROUTED_EVENT = 'spa:routed'
export type RoutedEvent = CustomEvent<{ path: string }>

const appRoot = (): HTMLElement => document.querySelector('#app') as HTMLElement

export function normalizePath(path: string): string {
  const name = (path || '')
    .trim()
    .replace(/^\/?/, '')
    .replace(/\.html$/i, '')
  return !name || name === 'index' ? '/' : `/${name}`
}

export function getRouteFromLocation(): string {
  // Use pathname last segment (e.g., /downloading)
  const last = (location.pathname.split('/').pop() || 'index').toLowerCase()
  return normalizePath(last)
}

function setHistoryForPath(path: string, replace = false): void {
  const normalized = normalizePath(path)
  // keep current directory as base (works for sub-path deployments and file://)
  const currentPath = location.pathname
  const baseDir = currentPath.replace(/\/?[^/]*$/, '') || '/'
  // When joining baseDir + normalized, avoid generating a leading '//' which the
  // browser interprets as a protocol-relative URL (e.g. '//history' -> 'http://history/').
  const cleanBase = baseDir.replace(/\/$/, '')
  const newUrl = normalized === '/' ? baseDir || '/' : `${cleanBase}${normalized}`
  if (replace) history.replaceState(null, '', newUrl)
  else history.pushState(null, '', newUrl)
}

let currentPath = getRouteFromLocation()
let isRouterMounted = false

export async function navigate(path: string, replace = false, skipHistory = false): Promise<void> {
  // If the router has already mounted at this path, avoid re-rendering.
  if (isRouterMounted && currentPath === path) return
  const root = appRoot()
  const route = routes[path] || routes['/']
  if (!root) return

  const performNavigation = async (): Promise<void> => {
    // unmount previous
    const prevPath = currentPath
    if (prevPath && prevPath !== path && routes[prevPath]?.unmount) {
      routes[prevPath].unmount!(root)
    }
    if (!skipHistory) {
      setHistoryForPath(path, replace)
    }
    currentPath = path
    root.innerHTML = `
      <new-dialog></new-dialog>
      <app-header></app-header>
      <app-sidebar></app-sidebar>
      <main></main>
    `
    await route.mount(root)
    try {
      window.dispatchEvent(new CustomEvent(ROUTED_EVENT, { detail: { path } }) as RoutedEvent)
    } catch {
      // no-op
    }
    isRouterMounted = true
  }

  const anyDocument = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> }
    __themeViewTransitionInProgress?: boolean
  }

  // If a theme-specific view transition is running, avoid stacking another
  // page-level transition. Just perform the navigation normally.
  if (!anyDocument.startViewTransition || anyDocument.__themeViewTransitionInProgress) {
    await performNavigation()
    return
  }

  await anyDocument.startViewTransition(() => performNavigation()).finished
}

export function initRouter(): void {
  // initial mount
  const path = getRouteFromLocation()
  window.addEventListener('popstate', () => {
    const routePath = getRouteFromLocation()
    void navigate(routePath, true, true)
  })
  void navigate(path, true)
}
