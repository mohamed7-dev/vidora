import html from './template.html?raw'
import style from './style.css?inline'
import appLogoUrl from '@renderer/assets/logo.svg?url'
import { UIButton } from '../ui'
import { NewDialog } from '../new-dialog/index'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../ui/lib/template-loader'
import { localizeElementsText } from '@renderer/lib/utils'

const HOME_PAGE_NAME = 'home-page'

export class HomePage extends HTMLElement {
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)

  // refs
  private _addDownloadBtn: UIButton | null = null
  private _logoImg: HTMLImageElement | null = null
  private _newDialog: NewDialog | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._init()
    this._setupListeners()
    this.shadowRoot && localizeElementsText(this.shadowRoot)
  }

  disconnectedCallback(): void {
    this._addDownloadBtn?.removeEventListener('click', this._openNewDialog)
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [HomePage.sheet]
    this.shadowRoot.append(HomePage.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._logoImg = this.shadowRoot?.querySelector('[data-el="logo-image"]') as HTMLImageElement
    this._addDownloadBtn = this.shadowRoot?.querySelector(
      '[data-el="add-download-btn"]'
    ) as UIButton
    this._newDialog = this.shadowRoot?.querySelector('new-dialog') as NewDialog
  }

  private _init(): void {
    if (!this._logoImg) return
    this._logoImg.src = appLogoUrl
  }

  private _openNewDialog = (): void => {
    if (this._newDialog) this._newDialog.open()
  }

  private _setupListeners(): void {
    this._addDownloadBtn?.addEventListener('click', this._openNewDialog)
  }
}

if (!customElements.get(HOME_PAGE_NAME)) {
  customElements.define(HOME_PAGE_NAME, HomePage)
}

declare global {
  interface HTMLElementTagNameMap {
    [HOME_PAGE_NAME]: HomePage
  }
}
