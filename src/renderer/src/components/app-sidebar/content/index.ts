import template from './template.html?raw'
import styleCss from './style.css?inline'
import { SIDEBAR_ITEMS } from './data'

export class AppSidebarContent extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(styleCss)
    return s
  })()
  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const inner = doc.querySelector('template')
    const t = document.createElement('template')
    t.innerHTML = inner ? inner.innerHTML : template
    return t
  })()
  // states
  private t = window.api?.i18n?.t || (() => undefined)
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._renderNav()
    this._highlightActive()
    this._bindNavigation()
    this._setupListeners()
  }
  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [AppSidebarContent.sheet]
    // append cached template content
    this.shadowRoot.append(AppSidebarContent.tpl.content.cloneNode(true))
  }

  private _highlightActive(): void {
    const root = this.shadowRoot as ShadowRoot
    const items = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.nav-item'))
    // Read current route from location.hash (e.g., #/downloading)
    const hash = (window.location.hash || '').replace(/^#\/?/, '')
    const current = (hash || 'index').trim().replace(/\.html$/i, '')
    for (const a of items) {
      const page = (a.dataset.page || '').trim().replace(/\.html$/i, '') || 'index'
      if (page === current) a.classList.add('active')
      else a.classList.remove('active')
    }
  }

  private _bindNavigation(): void {
    const root = this.shadowRoot as ShadowRoot
    const handler = (e: Event): void => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a.nav-item') as HTMLAnchorElement | null
      if (!anchor) return
      const page = (anchor.dataset.page || '').trim()
      if (!page) return
      e.preventDefault()
      window.api?.navigation?.navigate(page)
    }
    root.addEventListener('click', handler)
    root.addEventListener('auxclick', handler)
    root.addEventListener('keydown', ((e: Event) => {
      const ke = e as KeyboardEvent
      if (ke.key !== 'Enter' && ke.key !== ' ') return
      handler(e)
    }) as EventListener)
  }

  private _renderNav(): void {
    const root = this.shadowRoot as ShadowRoot
    const nav = root.querySelector('#app-sidebar-content-nav') as HTMLElement | null
    if (!nav) return

    nav.innerHTML = ''
    for (const sectionKey in SIDEBAR_ITEMS) {
      const section = SIDEBAR_ITEMS[sectionKey]
      const group = document.createElement('div')
      group.className = 'nav-section'

      if (section.title) {
        const titleEl = document.createElement('div')
        titleEl.className = 'nav-section-title'
        titleEl.textContent = this.t(section.title) ?? ''
        group.appendChild(titleEl)
      }

      for (const item of section.items) {
        const a = document.createElement('a')
        a.className = 'nav-item'
        a.id = item.id
        a.href = '#'
        a.dataset.page = item.page
        const labelSpan = document.createElement('span')
        labelSpan.textContent = this.t(item.title) ?? ''
        a.innerHTML = `<ui-icon name="${item.icon}"></ui-icon>`
        a.append(labelSpan)
        group.appendChild(a)
      }

      nav.appendChild(group)
    }
  }

  private _setupListeners(): void {
    window.addEventListener('spa:routed', (() => this._highlightActive()) as EventListener)
    window.addEventListener('popstate', (() => this._highlightActive()) as EventListener)
  }
}
if (!customElements.get('app-sidebar-content'))
  customElements.define('app-sidebar-content', AppSidebarContent)

declare global {
  interface HTMLElementTagNameMap {
    'app-sidebar-content': AppSidebarContent
  }
}
