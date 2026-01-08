import { ensureJsRuntimePath } from './check-js-runtime'

export async function initJsRuntime(): Promise<void> {
  await ensureJsRuntimePath()
}
