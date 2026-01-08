// ui-alert
export const UI_ALERT_TAG_NAME = 'ui-alert'

export const UI_ALERT_ATTRIBUTES = {
  VARIANT: 'variant',
  CLOSABLE: 'closable',
  OPEN: 'open',
  INSTANCE_ID: `${UI_ALERT_TAG_NAME}-instance-id`
}

export const UI_ALERT_EVENTS = {
  REQUEST_CLOSE: 'ui-alert-request-close',
  OPEN_CHANGE: 'ui-alert-open-change'
}

export type UIAlertVariant = 'default' | 'destructive'

export type UI_ALERT_CLOSE_EVENT_PAYLOAD = {
  alertInstanceId: string
}

export type UI_ALERT_OPEN_CHANGE_EVENT_PAYLOAD = {
  open: boolean
  alertInstanceId: string
}

// ui-alert-content
export const UI_ALERT_CONTENT_TAG_NAME = 'ui-alert-content'
export const UI_ALERT_CONTENT_ATTRIBUTES = {
  VARIANT: 'variant'
}

// ui-alert-title
export const UI_ALERT_TITLE_TAG_NAME = 'ui-alert-title'
export const UI_ALERT_TITLE_ATTRIBUTES = {
  VARIANT: 'variant'
}

// ui-alert-close
export const UI_ALERT_CLOSE_TAG_NAME = 'ui-alert-close'
export const UI_ALERT_CLOSE_ATTRIBUTES = {
  DISABLED: 'disabled',
  VARIANT: 'variant',
  CLOSABLE: 'closable'
}

// ui-alert-icon
export const UI_ALERT_ICON_TAG_NAME = 'ui-alert-icon'
export const ICONS = {
  destructive: 'triangle-alert',
  default: 'info'
}

export const UI_ALERT_ICON_ATTRIBUTES = {
  NAME: 'name',
  VARIANT: 'variant'
}

// ui-alert-header
export const UI_ALERT_HEADER_TAG_NAME = 'ui-alert-header'
