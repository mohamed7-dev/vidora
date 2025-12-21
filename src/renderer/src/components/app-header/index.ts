import '../preferences-dialog/index'
import '../new-dialog/index'
// import '../notification-popover/index' // will be back once we fix the bug
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { DATA } from '@root/shared/data'
import { UIButton, UIDialog, UISheet } from '../ui'

export class AppHeader extends HTMLElement {
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

  // refs
  private btnMin: UIButton | null = null
  private btnMax: UIButton | null = null
  private btnClose: UIButton | null = null
  private menuPreferences: HTMLElement | null = null
  private appTitle: HTMLElement | null = null
  private prefsDialog: UIDialog | null = null
  private dropdownEl: HTMLElement | null = null
  private navSheet: UISheet | null = null

  // states
  private _menuMounted = false
  private _menuListeners: AbortController | null = null
  private _navMounted = false
  private _navListeners: AbortController | null = null

  private t = window.api?.i18n?.t || (() => undefined)
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._init()
    this._applyListeners()
    this._dismissSheetOnClick()
    this._applyI18n()
  }

  private _dismissSheetOnClick(): void {
    if (!this.navSheet) return
    this.navSheet.addEventListener('nav-item-click', () => {
      this.navSheet?.close()
    })
  }

  private _applyListeners(): void {
    this.btnMin?.addEventListener('click', () => {
      window.api?.window?.minimize()
    })
    this.btnMax?.addEventListener('click', () => {
      window.api?.window?.toggleMaximize()
    })
    this.btnClose?.addEventListener('click', () => {
      window.api?.window?.close()
    })
    this.dropdownEl?.addEventListener('dropdown-show', () => this._mountMenu())
    this.dropdownEl?.addEventListener('dropdown-after-hide', () => this._unmountMenu())
    // this.navSheet?.addEventListener('sheet-show', () => this._mountNavContent())
    // this.navSheet?.addEventListener('sheet-after-hide', () => this._unmountNavContent())
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [AppHeader.sheet]
    this.shadowRoot.append(AppHeader.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this.btnMin = this.shadowRoot.querySelector('#chrome-controls-minimize') as UIButton
    this.btnMax = this.shadowRoot.querySelector('#chrome-controls-maximize') as UIButton
    this.btnClose = this.shadowRoot.querySelector('#chrome-controls-close') as UIButton
    this.menuPreferences = null
    this.appTitle = this.shadowRoot.querySelector('#app-header-title') as HTMLElement
    this.prefsDialog = this.shadowRoot.querySelector('preferences-dialog') as UIDialog
    this.dropdownEl = this.shadowRoot.querySelector('ui-dropdown') as HTMLElement
    this.navSheet = this.shadowRoot.querySelector('ui-sheet') as UISheet
  }

  private _init(): void {
    if (this.appTitle) this.appTitle.textContent = DATA.appName
  }

  private _applyI18n(): void {
    const root = this.shadowRoot as ShadowRoot
    const menuPreferences = root.querySelectorAll('[data-i18n]')
    menuPreferences.forEach((el) => {
      el.textContent = this.t(el.getAttribute('data-i18n') as string) ?? ''
    })
  }

  private _mountMenu(): void {
    if (this._menuMounted || !this.shadowRoot || !this.dropdownEl) return
    const tpl = this.shadowRoot.querySelector(
      '#app-header-dropdown-menu-tpl'
    ) as HTMLTemplateElement
    if (!tpl) return
    const frag = tpl.content.cloneNode(true) as DocumentFragment
    const appended: HTMLElement[] = []
    Array.from(frag.children).forEach((el) => {
      const node = el as HTMLElement
      node.setAttribute('data-owner', 'app-header')
      appended.push(node)
    })
    this.dropdownEl.append(...appended)
    this._menuListeners = new AbortController()
    this.menuPreferences = this.shadowRoot.querySelector(
      '#app-header-menu-preferences'
    ) as HTMLElement
    this.menuPreferences?.addEventListener(
      'click',
      () => {
        this.prefsDialog?.openDialog()
      },
      { signal: this._menuListeners.signal }
    )
    this._applyI18n()
    this._menuMounted = true
  }

  private _unmountMenu(): void {
    if (!this._menuMounted || !this.dropdownEl) return
    this._menuListeners?.abort()
    this._menuListeners = null
    const nodes = this.dropdownEl.querySelectorAll('[data-owner="app-header"]')
    nodes.forEach((n) => n.remove())
    this.menuPreferences = null
    this._menuMounted = false
  }

  // private _mountNavContent(): void {
  //   if (this._navMounted || !this.shadowRoot || !this.navSheet) return
  //   const tpl = this.shadowRoot.querySelector(
  //     '#app-header-navsheet-content-tpl'
  //   ) as HTMLTemplateElement
  //   if (!tpl) return
  //   const frag = tpl.content.cloneNode(true) as DocumentFragment
  //   const appended: HTMLElement[] = []
  //   Array.from(frag.children).forEach((el) => {
  //     const node = el as HTMLElement
  //     node.setAttribute('data-owner', 'app-header-nav')
  //     appended.push(node)
  //   })
  //   this.navSheet.append(...appended)
  //   this._navListeners = new AbortController()
  //   this._applyI18n()
  //   this._navMounted = true
  // }

  // private _unmountNavContent(): void {
  //   if (!this._navMounted || !this.navSheet) return
  //   this._navListeners?.abort()
  //   this._navListeners = null
  //   const nodes = this.navSheet.querySelectorAll('[data-owner="app-header-nav"]')
  //   nodes.forEach((n) => n.remove())
  //   this._navMounted = false
  // }
}

if (!customElements.get('app-header')) customElements.define('app-header', AppHeader)

declare global {
  interface HTMLElementTagNameMap {
    'app-header': AppHeader
  }
}
