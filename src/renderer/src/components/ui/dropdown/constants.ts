// ui-dropdown
export const UI_DROPDOWN_TAG_NAME = 'ui-dropdown'

export const UI_DROPDOWN_EVENTS = {
  OPEN_CHANGE: 'ui-dropdown-open-change',
  REQUEST_OPEN: 'ui-dropdown-request-open',
  REQUEST_CLOSE: 'ui-dropdown-request-close',
  REQUEST_TOGGLE: 'ui-dropdown-request-toggle'
}

export const UI_DROPDOWN_ATTRIBUTES = {
  OPEN: 'open',
  INSTANCE_ID: `${UI_DROPDOWN_TAG_NAME}-instance-id`,
  DISABLED: 'disabled'
}

export interface CloseEventDetail {
  menuId?: string
}

export interface ToggleEventDetail {
  menuId?: string
}

export interface OpenEventDetail {
  menuId?: string
}

export interface OpenChangeEventDetail {
  open: boolean
  menuId: string
}

// ui-dropdown-trigger
export const UI_DROPDOWN_TRIGGER_TAG_NAME = 'ui-dropdown-trigger'

// ui-dropdown-content
export const UI_DROPDOWN_CONTENT_TAG_NAME = 'ui-dropdown-content'

// ui-dropdown-item
export const UI_DROPDOWN_ITEM_TAG_NAME = 'ui-dropdown-item'

// ui-dropdown-portal
export const UI_DROPDOWN_PORTAL_TAG_NAME = 'ui-dropdown-portal'

export type UiDropdownAlign = 'center' | 'start' | 'end'
