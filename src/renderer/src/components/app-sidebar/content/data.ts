type Item = { id: string; title: string; page: string; icon: string }
type Section = { title: string; items: Item[] }
export const SIDEBAR_ITEMS: Record<string, Section> = {
  ['first-section']: {
    title: 'appSidebar.general.title',
    items: [
      {
        id: 'app-sidebar-nav-item-index',
        title: 'appSidebar.general.items.home',
        page: 'index.html',
        icon: 'house'
      },
      {
        id: 'app-sidebar-nav-item-history',
        title: 'appSidebar.general.items.history',
        page: 'history.html',
        icon: 'history'
      }
    ]
  },
  ['second-section']: {
    title: 'appSidebar.downloads.title',
    items: [
      {
        id: 'app-sidebar-nav-item-downloading',
        title: 'appSidebar.downloads.items.downloading',
        page: 'downloading.html',
        icon: 'arrow-big-down-dash'
      },
      {
        id: 'app-sidebar-nav-item-queued',
        title: 'appSidebar.downloads.items.queued',
        page: 'queued.html',
        icon: 'hour-glass'
      },
      {
        id: 'app-sidebar-nav-item-completed',
        title: 'appSidebar.downloads.items.completed',
        page: 'completed.html',
        icon: 'circle-check-big'
      }
    ]
  }
}
