import '../preferences-dialog/index'
import '../new-dialog/index'
import '../app-sidebar/content/index'

// import '../notification-popover/index' // will be back once we fix the bug
import html from './template.html?raw'
import style from './style.css?inline'
import { DATA } from '@root/shared/data'
import { UIButton, UIDialog, UISheet } from '../ui'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../ui/lib/template-loader'
import { NAV_ITEM_CLICKED_EVENT } from '../app-sidebar/content'

const APP_HEADER_NAME = 'app-header'

export class AppHeader extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // refs
  private btnMin: UIButton | null = null
  private btnMax: UIButton | null = null
  private btnClose: UIButton | null = null
  private appTitle: HTMLElement | null = null
  private prefsDialog: UIDialog | null = null
  private dropdownMenuPrefButton: UIButton | null = null
  private navSheet: UISheet | null = null

  // states
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
    this._applyI18n()
  }

  disconnectedCallback(): void {
    this._navListeners?.abort()
    this._navListeners = null
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
    this.appTitle = this.shadowRoot.querySelector('#app-header-title') as HTMLElement
    this.prefsDialog = this.shadowRoot.querySelector('preferences-dialog') as UIDialog
    this.dropdownMenuPrefButton = this.shadowRoot.querySelector(
      "[data-el='dropdown-menu-preferences-btn']"
    ) as UIButton
    this.navSheet = this.shadowRoot.querySelector('ui-sheet') as UISheet
  }

  private _applyListeners(): void {
    // Reset previous controller (if any) to avoid accumulating listeners
    this._navListeners?.abort()
    this._navListeners = new AbortController()

    const signal = this._navListeners.signal

    this.btnMin?.addEventListener(
      'click',
      () => {
        window.api?.window?.minimize()
      },
      { signal }
    )
    this.btnMax?.addEventListener(
      'click',
      () => {
        window.api?.window?.toggleMaximize()
      },
      { signal }
    )
    this.btnClose?.addEventListener(
      'click',
      () => {
        window.api?.window?.close()
      },
      { signal }
    )

    // dismisses sheet on clicking
    this.navSheet?.addEventListener(
      NAV_ITEM_CLICKED_EVENT,
      () => {
        this.navSheet?.closeSheet()
      },
      { signal }
    )
    // trigger pref dialog on click
    this.dropdownMenuPrefButton?.addEventListener(
      'click',
      () => {
        this.prefsDialog?.openDialog()
      },
      { signal }
    )
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
}

if (!customElements.get(APP_HEADER_NAME)) customElements.define(APP_HEADER_NAME, AppHeader)

declare global {
  interface HTMLElementTagNameMap {
    [APP_HEADER_NAME]: AppHeader
  }
}
