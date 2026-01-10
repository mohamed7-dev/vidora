// ui-tooltip
export const UI_TOOLTIP_TAG_NAME = 'ui-tooltip'

export const UI_TOOLTIP_EVENTS = {
  OPEN_CHANGE: 'ui-tooltip-open-change',
  REQUEST_OPEN: 'ui-tooltip-request-open',
  REQUEST_CLOSE: 'ui-tooltip-request-close'
}

export const UI_TOOLTIP_ATTRIBUTES = {
  OPEN: 'open',
  INSTANCE_ID: 'ui-tooltip-instance-id',
  DISABLED: 'disabled',
  SIDE: 'side',
  ALIGN: 'align',
  OFFSET: 'offset'
}

export interface CloseEventDetail {
  tooltipId: string
}

export interface OpenEventDetail {
  tooltipId: string
}

export interface OpenChangeEventDetail {
  tooltipId: string
  open: boolean
}
export type UiTooltipAlign = 'center' | 'start' | 'end'
export type UiTooltipSide = 'top' | 'right' | 'bottom' | 'left'

// ui-tooltip-trigger
export const UI_TOOLTIP_TRIGGER_TAG_NAME = 'ui-tooltip-trigger'

// ui-tooltip-content
export const UI_TOOLTIP_CONTENT_TAG_NAME = 'ui-tooltip-content'

// ui-tooltip-portal
export const UI_TOOLTIP_PORTAL_TAG_NAME = 'ui-tooltip-portal'
