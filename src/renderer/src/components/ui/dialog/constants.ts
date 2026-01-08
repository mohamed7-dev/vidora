// ui--dialog
export const UI_DIALOG_TAG_NAME = 'ui-dialog'

export const UI_DIALOG_EVENTS = {
  OPEN_CHANGE: 'ui-dialog-open-change',
  REQUEST_OPEN: 'ui-dialog-request-open',
  REQUEST_CLOSE: 'ui-dialog-request-close',
  REQUEST_TOGGLE: 'ui-dialog-request-toggle'
}

export const UI_DIALOG_ATTRIBUTES = {
  OPEN: 'open',
  INSTANCE_ID: `${UI_DIALOG_TAG_NAME}-instance-id`,
  HIDE_X_BUTTON: 'hide-x-button',
  ALERT: 'alert'
}

export interface CloseEventDetail {
  dialogId: string
}

export interface ToggleEventDetail {
  dialogId: string
}

export interface OpenEventDetail {
  dialogId: string
}

export interface OpenChangeEventDetail {
  dialogId: string
  open: boolean
}

// ui-dialog-trigger
export const UI_DIALOG_TRIGGER_TAG_NAME = 'ui-dialog-trigger'

// ui-dialog-title
export const UI_DIALOG_TITLE_TAG_NAME = 'ui-dialog-title'

// ui-dialog-portal
export const UI_DIALOG_PORTAL_TAG_NAME = 'ui-dialog-portal'

// ui-dialog-overlay
export const UI_DIALOG_OVERLAY_TAG_NAME = 'ui-dialog-overlay'

// ui-dialog-header
export const UI_DIALOG_HEADER_TAG_NAME = 'ui-dialog-header'

// ui-dialog-footer
export const UI_DIALOG_FOOTER_TAG_NAME = 'ui-dialog-footer'

// ui-dialog-description
export const UI_DIALOG_DESCRIPTION_TAG_NAME = 'ui-dialog-description'

// ui-dialog-content
export const UI_DIALOG_CONTENT_TAG_NAME = 'ui-dialog-content'

// ui-dialog-close
export const UI_DIALOG_CLOSE_TAG_NAME = 'ui-dialog-close'

// ui-dialog-body
export const UI_DIALOG_BODY_TAG_NAME = 'ui-dialog-body'
