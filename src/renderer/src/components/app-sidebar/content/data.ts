import { pagesRoutes } from '@renderer/lib/routes'

type Item = { id: string; title: string; page: string; icon: string }
export type Section = { title: string; items: Item[] }

export const getSidebarItems: () => Record<'first-section' | 'second-section', Section> = () => {
  const t = window.api.i18n.t
  return {
    ['first-section' as const]: {
      title: t`General`,
      items: [
        {
          id: 'app-sidebar-nav-item-index',
          title: t`Home`,
          page: pagesRoutes.home,
          icon: 'house'
        },
        {
          id: 'app-sidebar-nav-item-history',
          title: t`History`,
          page: pagesRoutes.history,
          icon: 'history'
        }
      ]
    },
    ['second-section' as const]: {
      title: t`Downloads`,
      items: [
        {
          id: 'app-sidebar-nav-item-downloading',
          title: t`Downloading`,
          page: pagesRoutes.downloading,
          icon: 'arrow-big-down-dash'
        },
        {
          id: 'app-sidebar-nav-item-queued',
          title: t`Queued`,
          page: pagesRoutes.queued,
          icon: 'hour-glass'
        },
        {
          id: 'app-sidebar-nav-item-completed',
          title: t`Completed`,
          page: pagesRoutes.completed,
          icon: 'circle-check-big'
        }
      ]
    }
  }
}
