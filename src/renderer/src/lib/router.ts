type RouteDef = {
  mount: (root: HTMLElement) => Promise<void> | void
  unmount?: (root: HTMLElement) => void
}

const _t = window.api.i18n?.t || (() => '')

const routes: Record<string, RouteDef> = {
  '/': {
    async mount(root) {
      const { renderHome } = await import('../views/home')
      document.title = _t('routes.home.title') || 'Home'
      renderHome(root)
    }
  },
  '/downloading': {
    async mount(root) {
      document.title = _t('routes.downloading.title') || 'Downloading'
      root.innerHTML = `<downloading-page></downloading-page>`
      await Promise.all([import('../components/downloading-page/index')])
    }
  },
  '/queued': {
    async mount(root) {
      document.title = _t('routes.queued.title') || 'Queued'
      root.innerHTML = `<queued-page></queued-page>`
      await Promise.all([import('../components/queued-page/index')])
    }
  },
  '/completed': {
    async mount(root) {
      document.title = _t('routes.completed.title') || 'Completed'
      root.innerHTML = `<completed-page></completed-page>`
      await Promise.all([import('../components/completed-page/index')])
    }
  },
  '/test': {
    async mount(root) {
      document.title = _t('routes.completed.title') || 'Completed'
      root.innerHTML = `<test-page></test-page>`
      await Promise.all([import('../components/test-page/index')])
    }
  }
}

const appRoot = (): HTMLElement => document.querySelector('#app') as HTMLElement

export function normalizePath(path: string): string {
  const name = (path || '')
    .trim()
    .replace(/^\/?/, '')
    .replace(/\.html$/i, '')
  return !name || name === 'index' ? '/' : `/${name}`
}

function getRouteFromLocation(): string {
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
  // Optional unmount previous
  const prevPath = currentPath
  if (prevPath && routes[prevPath]?.unmount) routes[prevPath].unmount!(root)
  // Update URL hash (keeps document URL at /pages/index.html)
  setHashForPath(path, replace)
  currentPath = path
  await route.mount(root)
  try {
    window.dispatchEvent(new CustomEvent('spa:routed', { detail: { path } }))
  } catch {
    // no-op
  }
}

let currentPath = getRouteFromLocation()
export function initRouter(): void {
  // window.addEventListener('hashchange', () => {
  //   const path = getRouteFromLocation()
  //   void navigate(path, true)
  // })
  // initial mount
  const path = getRouteFromLocation()
  void navigate(path, true)
}
