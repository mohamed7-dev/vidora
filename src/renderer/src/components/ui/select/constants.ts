// ui-select
export const UI_SELECT_TAG_NAME = 'ui-select'

export const UI_SELECT_EVENTS = {
  OPEN_CHANGE: 'ui-select-open-change',
  REQUEST_OPEN: 'ui-select-request-open',
  REQUEST_CLOSE: 'ui-select-request-close',
  REQUEST_TOGGLE: 'ui-select-request-toggle',
  VALUE_CHANGE: 'ui-select-value-change'
}

export const UI_SELECT_ATTRIBUTES = {
  OPEN: 'open',
  INSTANCE_ID: `${UI_SELECT_TAG_NAME}-instance-id`,
  VALUE: 'value',
  NAME: 'name',
  REQUIRED: 'required',
  DISABLED: 'disabled'
}

export interface OpenEventDetail {
  selectId: string
}

export interface CloseEventDetail {
  selectId: string
}

export interface ToggleEventDetail {
  selectId: string
}

export interface OpenChangeEventDetail {
  open: boolean
  selectId: string
}

export interface ValueChangeEventDetail {
  value: string | null
  selectId: string
}

// ui-select-trigger
export const UI_SELECT_TRIGGER_TAG_NAME = 'ui-select-trigger'

// ui-select-content
export const UI_SELECT_CONTENT_TAG_NAME = 'ui-select-content'

// ui-select-option
export const UI_SELECT_OPTION_TAG_NAME = 'ui-select-option'
export const UI_SELECT_OPTION_ATTRIBUTES = {
  VALUE: 'value',
  DATA_SELECTED: 'data-selected'
}

// ui-select-value
export const UI_SELECT_VALUE_TAG_NAME = 'ui-select-value'

// ui-select-portal
export const UI_SELECT_PORTAL_TAG_NAME = 'ui-select-portal'
export type UiSelectAlign = 'center' | 'start' | 'end'
