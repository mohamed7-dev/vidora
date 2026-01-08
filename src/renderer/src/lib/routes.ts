import { DATA } from '@root/shared/data'

const getMain = (root: HTMLElement): HTMLElement => {
  const main = root.querySelector('main') as HTMLElement
  main.innerHTML = ''
  return main
}

export const pagesRoutes: Record<string, string> = Object.fromEntries(
  DATA.pages.map((page) => [page.id, page.route])
)

type RouteDef = {
  mount: (root: HTMLElement) => Promise<void> | void
  unmount?: (root: HTMLElement) => void
}
export const routes: Record<string, RouteDef> = {
  [`/${pagesRoutes.home}`]: {
    async mount(root) {
      const { renderHome } = await import('../views/home')
      renderHome(getMain(root))
    }
  },
  [`/${pagesRoutes.downloading}`]: {
    async mount(root) {
      const { renderDownloading } = await import('../views/downloading')
      renderDownloading(getMain(root))
    }
  },
  [`/${pagesRoutes.queued}`]: {
    async mount(root) {
      const { renderQueued } = await import('../views/queued')
      renderQueued(getMain(root))
    }
  },
  [`/${pagesRoutes.completed}`]: {
    async mount(root) {
      const { renderCompleted } = await import('../views/completed')
      renderCompleted(getMain(root))
    }
  },
  [`/${pagesRoutes.history}`]: {
    async mount(root) {
      const { renderHistory } = await import('../views/history')
      renderHistory(getMain(root))
    }
  }
}
