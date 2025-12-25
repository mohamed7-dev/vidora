const _t = window.api?.i18n?.t || (() => '')

type RouteDef = {
  mount: (root: HTMLElement) => Promise<void> | void
  unmount?: (root: HTMLElement) => void
}
export const routes: Record<string, RouteDef> = {
  '/': {
    async mount(root) {
      document.title = _t('routes.home.title') || 'Home'
      const { renderHome } = await import('../views/home')
      renderHome(root.querySelector('main') as HTMLElement)
    }
  },
  '/downloading': {
    async mount(root) {
      document.title = _t('routes.downloading.title') || 'Downloading'
      const { renderDownloading } = await import('../views/downloading')
      renderDownloading(root.querySelector('main') as HTMLElement)
    }
  },
  '/queued': {
    async mount(root) {
      document.title = _t('routes.queued.title') || 'Queued'
      const { renderQueued } = await import('../views/queued')
      renderQueued(root.querySelector('main') as HTMLElement)
    }
  },
  '/completed': {
    async mount(root) {
      document.title = _t('routes.completed.title') || 'Completed'
      const { renderCompleted } = await import('../views/completed')
      renderCompleted(root.querySelector('main') as HTMLElement)
    }
  }
}
