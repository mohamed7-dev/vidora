// ui-sheet
export const UI_SHEET_TAG_NAME = 'ui-sheet'

export const UI_SHEET_EVENTS = {
  OPEN_CHANGE: 'ui-sheet-open-change',
  REQUEST_OPEN: 'ui-sheet-request-open',
  REQUEST_CLOSE: 'ui-sheet-request-close',
  REQUEST_TOGGLE: 'ui-sheet-request-toggle'
}

export const UI_SHEET_ATTRIBUTES = {
  OPEN: 'open',
  INSTANCE_ID: `${UI_SHEET_TAG_NAME}-instance-id`,
  HIDE_X_BUTTON: 'hide-x-button',
  ALERT: 'alert',
  SIDE: 'side'
}

export type SheetSide = 'left' | 'right' | 'top' | 'bottom'

export interface OpenEventDetail {
  sheetId: string
}

export interface CloseEventDetail {
  sheetId: string
}

export interface ToggleEventDetail {
  sheetId: string
}
export interface OpenChangeEventDetail {
  sheetId: string
  open: boolean
}

// ui-sheet-trigger
export const UI_SHEET_TRIGGER_TAG_NAME = 'ui-sheet-trigger'

// ui-sheet-content
export const UI_SHEET_CONTENT_TAG_NAME = 'ui-sheet-content'

// ui-sheet-close
export const UI_SHEET_CLOSE_TAG_NAME = 'ui-sheet-close'

// ui-sheet-portal
export const UI_SHEET_PORTAL_TAG_NAME = 'ui-sheet-portal'

// ui-sheet-overlay
export const UI_SHEET_OVERLAY_TAG_NAME = 'ui-sheet-overlay'

// ui-sheet-header
export const UI_SHEET_HEADER_TAG_NAME = 'ui-sheet-header'

// ui-sheet-footer
export const UI_SHEET_FOOTER_TAG_NAME = 'ui-sheet-footer'

// ui-sheet-description
export const UI_SHEET_DESCRIPTION_TAG_NAME = 'ui-sheet-description'

// ui-sheet-title
export const UI_SHEET_TITLE_TAG_NAME = 'ui-sheet-title'

// ui-sheet-body
export const UI_SHEET_BODY_TAG_NAME = 'ui-sheet-body'
