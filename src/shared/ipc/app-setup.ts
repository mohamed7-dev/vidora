export const APP_SETUP_CHANNELS = {
  STATUS: 'app:setup-status',
  GET_STATUS: 'app:setup-status:get'
}

export type AppSetupChannelPayload =
  | {
      status: 'success'
      message: string
      payload: object
    }
  | {
      status: 'error'
      message: string
      payload: {
        cause: string
      }
    }
  | {
      status: 'pending'
      message: string
      payload: object
    }
