import '../preferences-dialog'
import '../new-dialog'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import resetStyle from '@renderer/assets/reset.css?inline'
import iconMinSvg from '@renderer/assets/icons/minus.svg?raw'
import iconMaxSvg from '@renderer/assets/icons/square.svg?raw'
import iconCloseSvg from '@renderer/assets/icons/x.svg?raw'
import iconDropdownSvg from '@renderer/assets/icons/ellipsis-vertical.svg?raw'
import iconSheetSvg from '@renderer/assets/icons/menu.svg?raw'
import { DATA } from '@root/shared/data'
import { UIButton, UIDialog } from '../ui'

export class AppHeader extends HTMLElement {
  private root: ShadowRoot | null = null
  private btnMin: UIButton | null = null
  private btnMax: UIButton | null = null
  private btnClose: UIButton | null = null
  private btnDropdown: UIButton | null = null
  private btnSheet: UIButton | null = null
  private menuPreferences: HTMLElement | null = null
  private appTitle: HTMLElement | null = null
  private prefsDialog: UIDialog | null = null

  private t = window.api?.i18n?.t || (() => undefined)
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.root = this.shadowRoot
    this.render()
    this.applySvgIcons()
    this.applyListeners()
    this.applyI18n()
  }

  private applyListeners(): void {
    this.btnMin?.addEventListener('click', () => {
      window.api?.window?.minimize()
    })
    this.btnMax?.addEventListener('click', () => {
      window.api?.window?.toggleMaximize()
    })
    this.btnClose?.addEventListener('click', () => {
      window.api?.window?.close()
    })
    this.menuPreferences?.addEventListener('click', () => {
      const prefs = this.prefsDialog as UIDialog
      if (!prefs) return
      prefs.openDialog()
    })
  }

  private render(): void {
    const parser = new DOMParser()
    const parsedTree = parser.parseFromString(template, 'text/html')
    const templateElement = parsedTree.querySelector<HTMLTemplateElement>('#app-header-template')
    if (!templateElement) return
    const content = templateElement.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = resetStyle + styleCss
    this.shadowRoot?.append(style, content)
    // query elements
    this.btnMin = this.root?.querySelector('#chrome-controls-minimize') as UIButton | null
    this.btnMax = this.root?.querySelector('#chrome-controls-maximize') as UIButton | null
    this.btnClose = this.root?.querySelector('#chrome-controls-close') as UIButton | null
    this.btnDropdown = this.root?.querySelector('#app-header-dropdown-button') as UIButton | null
    this.btnSheet = this.root?.querySelector('#app-header-sheet-button') as UIButton | null
    this.menuPreferences = this.root?.querySelector(
      '#app-header-menu-preferences'
    ) as HTMLElement | null
    this.appTitle = this.root?.querySelector('#app-header-title') as HTMLElement | null
    this.prefsDialog = this.root?.querySelector('preferences-dialog') as UIDialog | null
  }

  private applySvgIcons(): void {
    if (this.appTitle) this.appTitle.textContent = DATA.appName
    if (this.btnMin) this.btnMin.innerHTML = iconMinSvg
    if (this.btnMax) this.btnMax.innerHTML = iconMaxSvg
    if (this.btnClose) this.btnClose.innerHTML = iconCloseSvg
    if (this.btnDropdown) this.btnDropdown.innerHTML = iconDropdownSvg
    if (this.btnSheet) this.btnSheet.innerHTML = iconSheetSvg
  }

  private applyI18n(): void {
    const root = this.shadowRoot as ShadowRoot
    const menuPreferences = root.querySelectorAll('[data-i18n]')
    menuPreferences.forEach((el) => {
      el.textContent = this.t(el.getAttribute('data-i18n') as string) ?? ''
    })
  }
}

customElements.define('app-header', AppHeader)
