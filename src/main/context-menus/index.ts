import { AppConfig } from '../../shared/types'
import { initPasteLinkContextMenu } from './paste-link-ctx-menu'

/**
 * @description
 * This function initializes all menus in the app
 */
export function initMenus(appConfig: AppConfig): void {
  initPasteLinkContextMenu(appConfig)
}
