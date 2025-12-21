export const APP_SETUP_CHANNELS = {
  STATUS: 'app:setup-status'
}

export type AppSetupChannelPayload =
  | {
      status: 'success'
      message: string
      messageKey: string
      cause?: string
    }
  | {
      status: 'error'
      message: string
      messageKey: string
      cause: string
    }
