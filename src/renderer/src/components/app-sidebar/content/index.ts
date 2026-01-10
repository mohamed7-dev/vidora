import html from './template.html?raw'
import style from './style.css?inline'
import { getSidebarItems, Section } from './data'

import { getRouteFromLocation, ROUTED_EVENT } from '@renderer/lib/router'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'

const APP_SIDEBAR_CONTENT_NAME = 'app-sidebar-content'
export const NAV_ITEM_CLICKED_EVENT = 'nav-item-clicked'

export interface NavItemClickDetail {
  page: string
}

export class AppSidebarContent extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)
  // refs
  private _navContainer: HTMLElement | null = null
  private _navItemTemplate: HTMLTemplateElement | null = null
  private _navSectionTemplate: HTMLTemplateElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()

    this._renderNav()
    this._highlightActive()
    this._bindNavigation()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._removeListeners()
  }

  private _removeListeners(): void {
    window.removeEventListener(ROUTED_EVENT, this._highlightActive)
    window.removeEventListener('popstate', this._highlightActive)
    this.shadowRoot?.removeEventListener('click', this._handleNavigation)
    this.shadowRoot?.removeEventListener('auxclick', this._handleNavigation)
    this.shadowRoot?.removeEventListener('keydown', this._handleKeydown)
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [AppSidebarContent.sheet]
    this.shadowRoot.append(AppSidebarContent.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._navContainer = this.shadowRoot.querySelector('[data-el="nav-container"]')
    this._navItemTemplate = this.shadowRoot.querySelector('[data-el="nav-item-template"]')
    this._navSectionTemplate = this.shadowRoot.querySelector('[data-el="nav-section-template"]')
  }

  private _highlightActive(): void {
    const items = this._getNavItems()
    const current = getRouteFromLocation()
    for (const a of items) {
      const page = '/' + (a.dataset.page || '').trim()
      if (page === current) a.setAttribute('active', '')
      else a.removeAttribute('active')
    }
  }

  private _handleNavigation(e: Event): void {
    const target = e.target as HTMLElement
    const anchor = target.closest('a[data-el="nav-item"]') as HTMLAnchorElement | null
    if (!anchor) return
    const page = (anchor.dataset.page || '').trim()
    const ev = new CustomEvent<NavItemClickDetail>(NAV_ITEM_CLICKED_EVENT, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { page }
    })
    const notPrevented = this.dispatchEvent(ev)
    if (notPrevented) {
      e.preventDefault()
      window.api.navigation.navigate(page)
    }
  }

  private _handleKeydown(e: Event): void {
    const ke = e as KeyboardEvent
    if (ke.key !== 'Enter' && ke.key !== ' ') return
    this._handleNavigation(e)
  }

  private _bindNavigation(): void {
    const root = this.shadowRoot as ShadowRoot
    root.addEventListener('click', this._handleNavigation)
    root.addEventListener('auxclick', this._handleNavigation)
    root.addEventListener('keydown', this._handleKeydown)
  }

  private _renderNav(): void {
    if (!this._navItemTemplate || !this._navSectionTemplate || !this._navContainer) return undefined
    const navItemTemplateContent = this._navItemTemplate.content.cloneNode(true)
    const navSectionTemplateContent = this._navSectionTemplate.content.cloneNode(true)

    const sidebarItems = getSidebarItems()
    for (const sectionKey in sidebarItems) {
      const section = sidebarItems[sectionKey] as Section
      const group = (navSectionTemplateContent.cloneNode(true) as DocumentFragment).querySelector(
        "[data-el='nav-section']"
      ) as HTMLElement
      if (section.title) {
        const titleEl = group.querySelector('[data-el="nav-section-title"]') as HTMLElement
        titleEl.textContent = section.title ?? ''
      }

      const itemsContainer = group.querySelector('[data-el="nav-section-items"]') as HTMLElement
      for (const item of section.items) {
        const a = (navItemTemplateContent.cloneNode(true) as DocumentFragment).querySelector(
          "[data-el='nav-item']"
        ) as HTMLAnchorElement
        a.id = item.id
        a.href = '#'
        a.dataset.page = item.page
        const labelSpan = a.querySelector('[data-el="nav-item-label"]') as HTMLElement
        labelSpan.textContent = item.title ?? ''
        const icon = a.querySelector('[data-el="nav-item-icon"]') as HTMLElement
        icon.setAttribute('name', item.icon)
        itemsContainer.appendChild(a)
      }

      this._navContainer.appendChild(group)
    }
  }

  private _setupListeners(): void {
    window.addEventListener(ROUTED_EVENT, (() => this._highlightActive()) as EventListener)
    window.addEventListener('popstate', (() => this._highlightActive()) as EventListener)
  }

  //-------------------------Utils-------------------------------
  private _getNavItems(): HTMLAnchorElement[] {
    const root = this.shadowRoot as ShadowRoot
    return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[data-el="nav-item"]'))
  }
}
if (!customElements.get(APP_SIDEBAR_CONTENT_NAME))
  customElements.define(APP_SIDEBAR_CONTENT_NAME, AppSidebarContent)

declare global {
  interface HTMLElementTagNameMap {
    [APP_SIDEBAR_CONTENT_NAME]: AppSidebarContent
  }
}
