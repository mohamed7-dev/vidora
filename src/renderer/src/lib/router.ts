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
  // Prefer hash (e.g., #/downloading); fallback to pathname last segment
  const hash = (window.location.hash || '').replace(/^#\/?/, '')
  if (hash) return normalizePath(hash)
  const last = (location.pathname.split('/').pop() || 'index').toLowerCase()
  return normalizePath(last)
}

function setHashForPath(path: string, replace = false): void {
  const name = normalizePath(path).replace(/^\//, '')
  const newUrl = name ? `${location.pathname}#/${name}` : `${location.pathname}#`
  if (replace) history.replaceState(null, '', newUrl)
  else history.pushState(null, '', newUrl)
}

export async function navigate(path: string, replace = false): Promise<void> {
  const root = appRoot()
  const route = routes[path] || routes['/']
  if (!root) return
  // unmount previous
  const prevPath = currentPath
  if (prevPath && prevPath !== path && routes[prevPath]?.unmount) routes[prevPath].unmount!(root)
  // Update URL hash (keeps document URL at /pages/index.html)
  setHashForPath(path, replace)
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
}

let currentPath = getRouteFromLocation()
export function initRouter(): void {
  // initial mount
  const path = getRouteFromLocation()
  void navigate(path, true)
}
