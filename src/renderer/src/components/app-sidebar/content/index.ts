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
    const path = window.location.pathname
    // Simple heuristic: check if href filename is a suffix of current path
    for (const a of items) {
      const href = a.getAttribute('href') ?? ''
      const url = new URL(href, window.location.href)
      const hrefFile = url.pathname.split('/').pop()
      const curFile = path.split('/').pop()
      if (hrefFile && curFile && hrefFile === curFile) {
        a.classList.add('active')
      }
    }
  }

  private _bindNavigation(): void {
    const root = this.shadowRoot as ShadowRoot
    root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a.nav-item') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      const url = new URL(href, window.location.href)
      const page = url.pathname.split('/').pop()
      if (page) {
        e.preventDefault()
        window.api?.navigation?.navigate(page)
      }
    })
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
        a.href = `../../pages/${item.page}`
        const labelSpan = document.createElement('span')
        labelSpan.textContent = this.t(item.title) ?? ''
        a.innerHTML = `<ui-icon name="${item.icon}"></ui-icon>`
        a.append(labelSpan)
        group.appendChild(a)
      }

      nav.appendChild(group)
    }
  }
}

customElements.define('app-sidebar-content', AppSidebarContent)
