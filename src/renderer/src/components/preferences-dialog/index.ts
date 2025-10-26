import './tabs-content/general-tab/index'
import './tabs-content/downloader-tab/index'
import './tabs-content/downloads-tab/index'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIDialog, UIButton, UITabs } from '../ui'
import settingsIcon from '@renderer/assets/icons/settings.svg?raw'
import arrowIcon from '@renderer/assets/icons/arrow-big-down-dash.svg?raw'

export class PreferencesDialog extends HTMLElement {
  constructor() {
    super()

    this.attachShadow({ mode: 'open' })
  }

  private t = window.api?.i18n?.t || (() => '')

  connectedCallback(): void {
    const parser = new DOMParser()
    const parsedTree = parser.parseFromString(template, 'text/html')
    const templateElement = parsedTree.querySelector<HTMLTemplateElement>(
      '#preferences-dialog-template'
    )
    if (!templateElement) return
    const content = templateElement.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = styleCss
    this.shadowRoot?.append(style, content)

    this.renderTriggerButtons()

    // i18n init and binding
    this.applyI18n()

    const tabs = this.shadowRoot?.querySelector('ui-tabs') as UITabs | null
    if (tabs) {
      const apply = (): void => this.updateTriggerVariants(tabs.value || '')
      tabs.addEventListener('change', apply as EventListener)
      // initialize once after triggers rendered
      apply()
    }
  }

  private renderTriggerButtons(): void {
    const generalTabTrigger = this.shadowRoot?.querySelector('#general-tab-trigger') as UIButton
    const downloaderTabTrigger = this.shadowRoot?.querySelector(
      '#downloader-tab-trigger'
    ) as UIButton
    const downloadsTabTrigger = this.shadowRoot?.querySelector('#downloads-tab-trigger') as UIButton
    generalTabTrigger.innerHTML = settingsIcon + generalTabTrigger.innerHTML
    downloaderTabTrigger.innerHTML = arrowIcon + downloaderTabTrigger.innerHTML
    downloadsTabTrigger.innerHTML = arrowIcon + downloadsTabTrigger.innerHTML

    generalTabTrigger.addEventListener('click', () => {
      ;(this.shadowRoot?.querySelector('ui-tabs') as UITabs).value = 'general'
    })
    downloaderTabTrigger.addEventListener('click', () => {
      ;(this.shadowRoot?.querySelector('ui-tabs') as UITabs).value = 'downloader'
    })
    downloadsTabTrigger.addEventListener('click', () => {
      ;(this.shadowRoot?.querySelector('ui-tabs') as UITabs).value = 'downloads'
    })
  }

  private updateTriggerVariants(active: string): void {
    const general = this.shadowRoot?.querySelector('#general-tab-trigger') as UIButton | null
    const downloader = this.shadowRoot?.querySelector('#downloader-tab-trigger') as UIButton | null
    const downloads = this.shadowRoot?.querySelector('#downloads-tab-trigger') as UIButton | null
    const map: Record<string, UIButton | null> = {
      general,
      downloader,
      downloads
    }
    for (const [key, btn] of Object.entries(map)) {
      if (!btn) continue
      if (key === active) btn.setAttribute('variant', 'secondary')
      else btn.setAttribute('variant', 'ghost')
    }
  }

  private applyI18n(): void {
    const root = this.shadowRoot
    if (!root) return
    const nodes = root.querySelectorAll<HTMLElement>('[data-i18n]')
    nodes.forEach((el) => {
      const key = el.getAttribute('data-i18n') || ''
      if (!key) return
      el.textContent = this.t(key)
    })
  }

  openDialog(): void {
    ;(this.shadowRoot?.querySelector('ui-dialog') as UIDialog)?.openDialog()
  }
}

customElements.define('preferences-dialog', PreferencesDialog)
