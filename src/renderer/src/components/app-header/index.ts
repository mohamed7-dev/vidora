import '../preferences-dialog/index'
import '../about-dialog/about-dialog.component'
import '../app-sidebar/content/index'

// import '../notification-popover/index' // will be back once we fix the bug
import html from './template.html?raw'
import style from './style.css?inline'
import { DATA } from '@root/shared/data'
import { NEW_DIALOG_EVENTS, NewDialog } from '../new-dialog/index'
import { NAV_ITEM_CLICKED_EVENT } from '../app-sidebar/content'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { type UiButton } from '@ui/button/ui-button'
import { type UiSheet } from '@ui/sheet/ui-sheet'
import { PreferencesDialog } from '../preferences-dialog/index'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { AboutDialog } from '../about-dialog/about-dialog.component'

const APP_HEADER_NAME = 'app-header'

export class AppHeader extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // refs
  private btnMin: UiButton | null = null
  private btnMax: UiButton | null = null
  private btnClose: UiButton | null = null
  private appTitle: HTMLElement | null = null
  private prefsDialog: PreferencesDialog | null = null
  private aboutDialog: AboutDialog | null = null
  private menuPrefDialogItemBtn: UiButton | null = null
  private menuAboutDialogItemBtn: UiButton | null = null
  private navSheet: UiSheet | null = null
  private newDialogTrigger: NewDialog | null = null

  // states
  private _navListeners: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._init()
    this._applyListeners()
    localizeElementsText(this.shadowRoot as ShadowRoot)
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
    this.btnMin = this.shadowRoot.querySelector('[data-el="minimize-btn"]') as UiButton
    this.btnMax = this.shadowRoot.querySelector('[data-el="maximize-btn"]') as UiButton
    this.btnClose = this.shadowRoot.querySelector('[data-el="close-btn"]') as UiButton
    this.appTitle = this.shadowRoot.querySelector('[data-el="app-header-title"]') as HTMLElement
    this.prefsDialog = this.shadowRoot.querySelector('preferences-dialog') as PreferencesDialog
    this.aboutDialog = this.shadowRoot.querySelector('about-dialog') as AboutDialog
    this.menuPrefDialogItemBtn = this.shadowRoot.querySelector(
      "[data-el='menu-item-pref-dialog']"
    ) as UiButton
    this.menuAboutDialogItemBtn = this.shadowRoot.querySelector(
      "[data-el='menu-item-about-dialog']"
    ) as UiButton
    this.navSheet = this.shadowRoot.querySelector('ui-sheet') as UiSheet
    this.newDialogTrigger = this.shadowRoot.querySelector(
      '[data-el="new-dialog-trigger"]'
    ) as NewDialog | null
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
        if (this.navSheet) {
          this.navSheet.open = false
        }
      },
      { signal }
    )
    this.menuPrefDialogItemBtn?.addEventListener(
      'click',
      () => {
        this.prefsDialog?.openDialog()
      },
      { signal }
    )

    this.menuAboutDialogItemBtn?.addEventListener(
      'click',
      () => {
        this.aboutDialog?.openDialog()
      },
      { signal }
    )
    this.newDialogTrigger?.addEventListener(
      'click',
      () => {
        this.dispatchEvent(
          new CustomEvent(NEW_DIALOG_EVENTS.OPEN, {
            bubbles: true,
            composed: true
          })
        )
      },
      { signal }
    )
  }

  private _init(): void {
    if (this.appTitle) this.appTitle.textContent = DATA.appName
  }
}

if (!customElements.get(APP_HEADER_NAME)) customElements.define(APP_HEADER_NAME, AppHeader)

declare global {
  interface HTMLElementTagNameMap {
    [APP_HEADER_NAME]: AppHeader
  }
}
