import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIButton, UIPopover } from '../ui'
import { ApproveAppInstallPayload, ApproveAppUpdatePayload } from '@root/shared/app-update'
import { StatusSnapshot, TaskStatus } from '@root/shared/status'

export class NotificationPopover extends HTMLElement {
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
  private _popoverEl: UIPopover | null = null
  private _popoverContentEl: HTMLDivElement | null = null

  // states
  private _approvedDownload = false
  private _approvedInstall = false
  private _t = window.api.i18n?.t || (() => '')
  private unsubStatus: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['hide']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'hide') {
      this._syncHide()
    }
  }

  connectedCallback(): void {
    this._render()
    this._cacheRefs()
    this._syncHide()
    this._applyListeners()
  }

  disconnectedCallback(): void {
    this.unsubStatus?.()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [NotificationPopover.sheet]
    const frag = NotificationPopover.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._popoverEl = this.shadowRoot.querySelector('ui-popover') as UIPopover
    this._popoverContentEl = this.shadowRoot.querySelector(
      '[data-el="popover-content-container"]'
    ) as HTMLDivElement | null
  }

  private _syncHide(): void {
    const attr = this.getAttribute('hide')
    const hide = attr === null ? true : attr === 'true'
    this._popoverEl?.setAttribute('data-hide', hide ? 'true' : 'false')
  }

  private _applyListeners(): void {
    // listen to statuses coming from main process related to the appUpdate kind
    this.unsubStatus = window.api.status.onUpdate((snap) => this._reflect(snap))
  }

  private _reflect(snap: StatusSnapshot): void {
    const st = snap.appUpdate

    // If there is no appUpdate status yet, keep the popover hidden
    if (!st || st.kind !== 'appUpdate' || st.state === 'idle') {
      this.setAttribute('hide', 'true')
      return
    }

    // We have something meaningful to show for app updates
    this.setAttribute('hide', 'false')

    if (
      snap.appUpdate?.kind === 'appUpdate' &&
      snap.appUpdate.state === 'pending' && // pending + download scope means download waiting for approval
      snap.appUpdate.messageParams &&
      snap.appUpdate.messageParams?.scope === 'download'
    ) {
      this._renderUpdateAppApproval(
        snap.appUpdate.messageParams as unknown as ApproveAppUpdatePayload
      )
    }

    if (
      this._approvedDownload &&
      snap.appUpdate?.kind === 'appUpdate' &&
      snap.appUpdate.state === 'pending' && // pending + approved means download in progress
      snap.appUpdate.messageParams &&
      snap.appUpdate.messageParams?.scope === 'download'
    ) {
      this._renderUpdateAppProgress(snap.appUpdate)
    }

    if (
      snap.appUpdate?.kind === 'appUpdate' &&
      snap.appUpdate.state === 'pending' && // pending + install scope means install waiting for approval
      snap.appUpdate.messageParams &&
      snap.appUpdate.messageParams?.scope === 'install'
    ) {
      this._renderInstallAppApproval(
        snap.appUpdate.messageParams as unknown as ApproveAppInstallPayload
      )
    }

    if (
      snap.appUpdate?.kind === 'appUpdate' &&
      snap.appUpdate.state === 'error' && // error means either error during download/install or user cancelled
      (snap.appUpdate.message || snap.appUpdate.messageKey || snap.appUpdate.error)
    ) {
      this._renderError(snap.appUpdate)
    }
  }

  private _renderUpdateAppApproval(ev: ApproveAppUpdatePayload): void {
    if (!this.shadowRoot || !this._popoverContentEl) return
    const approveAppUpdateTpl = this.shadowRoot.querySelector(
      '[data-el="approve-app-update-template"]'
    ) as HTMLTemplateElement | null
    if (!approveAppUpdateTpl) return
    const content = approveAppUpdateTpl.content.cloneNode(true) as DocumentFragment
    const messageEl = content.querySelector('[data-el="approve-download-msg"]')
    if (!messageEl) return
    messageEl.textContent = this._t(ev.messageKey) || ev.message
    const approveBtnEl = content.querySelector(
      '[data-el="approve-download-btn"]'
    ) as UIButton | null
    const cancelBtnEl = content.querySelector('[data-el="cancel-download-btn"]') as UIButton | null
    if (!approveBtnEl || !cancelBtnEl) return
    approveBtnEl.addEventListener('click', () => {
      this._approvedDownload = true
      window.api.appUpdate.respondToDownloadApproval(1)
    })
    cancelBtnEl.addEventListener('click', () => {
      window.api.appUpdate.respondToDownloadApproval(0)
      this.close()
      this.setAttribute('hide', 'true')
    })
    this._popoverContentEl.innerHTML = ''
    this._popoverContentEl.append(content)
  }

  private _renderUpdateAppProgress(status: TaskStatus): void {
    if (!this.shadowRoot || !this._popoverContentEl) return
    const progressTpl = this.shadowRoot.querySelector(
      '[data-el="app-update-progress-template"]'
    ) as HTMLTemplateElement | null
    if (!progressTpl) return
    const content = progressTpl.content.cloneNode(true) as DocumentFragment
    const msgEl = content.querySelector('[data-el="progress-msg"]') as HTMLElement | null
    const valueEl = content.querySelector('[data-el="progress-value"]') as HTMLElement | null
    if (!msgEl || !valueEl) return

    const key = status.messageKey || 'appUpdate.download.progress'
    const fallbackMsg = status.message || 'Downloading update...'
    msgEl.textContent = this._t(key) || fallbackMsg

    const prog = typeof status.progress === 'number' ? Math.round(status.progress) : 0
    valueEl.textContent = `${prog}%`

    this._popoverContentEl.innerHTML = ''
    this._popoverContentEl.append(content)
  }

  private _renderInstallAppApproval(ev: ApproveAppInstallPayload): void {
    if (!this.shadowRoot || !this._popoverContentEl) return
    const approveAppUpdateTpl = this.shadowRoot.querySelector(
      '[data-el="approve-app-install-template"]'
    ) as HTMLTemplateElement | null
    if (!approveAppUpdateTpl) return
    const content = approveAppUpdateTpl.content.cloneNode(true) as DocumentFragment
    const messageEl = content.querySelector('[data-el="approve-install-msg"]')
    if (!messageEl) return
    messageEl.textContent = this._t(ev.messageKey) || ev.message
    const approveBtnEl = content.querySelector('[data-el="approve-install-btn"]') as UIButton | null
    const cancelBtnEl = content.querySelector('[data-el="cancel-install-btn"]') as UIButton | null
    if (!approveBtnEl || !cancelBtnEl) return
    approveBtnEl.addEventListener('click', () => {
      this._approvedInstall = true
      window.api.appUpdate.respondToInstallApproval(1)
    })
    cancelBtnEl.addEventListener('click', () => {
      window.api.appUpdate.respondToInstallApproval(0)
      this.close()
      this.setAttribute('hide', 'true')
    })
    this._popoverContentEl.innerHTML = ''
    this._popoverContentEl.append(content)
  }

  private _renderError(status: TaskStatus): void {
    if (!this.shadowRoot || !this._popoverContentEl) return

    // Skip pure cancellation errors (e.g. *\.cancelled keys)
    const key = status.messageKey || status.error?.key || ''
    if (key.endsWith('.cancelled')) {
      return
    }

    const errorTpl = this.shadowRoot.querySelector(
      '[data-el="app-update-error-template"]'
    ) as HTMLTemplateElement | null
    if (!errorTpl) return

    const content = errorTpl.content.cloneNode(true) as DocumentFragment
    const msgEl = content.querySelector('[data-el="error-msg"]') as HTMLElement | null
    const dismissBtn = content.querySelector('[data-el="dismiss-error-btn"]') as UIButton | null
    if (!msgEl || !dismissBtn) return

    const fallbackMsg =
      (status.error && status.error.message) || status.message || 'Failed to update the app.'
    msgEl.textContent = (key && this._t(key)) || fallbackMsg

    dismissBtn.addEventListener('click', () => {
      this.close()
      this.setAttribute('hide', 'true')
    })

    this._popoverContentEl.innerHTML = ''
    this._popoverContentEl.append(content)
  }

  open(): void {
    if (!this._popoverEl) return
    this._popoverEl.open = true
  }

  close(): void {
    if (!this._popoverEl) return
    this._popoverEl.open = false
  }
}

if (!customElements.get('notification-popover')) {
  customElements.define('notification-popover', NotificationPopover)
}
