/**
 * Gnosis v2 client layer.
 *
 * Chooses the HTTP client when NEXT_PUBLIC_GNOSIS_API points at a live
 * backend; otherwise the app runs against the local demo client with
 * the curated corpus and simulated providers.
 */

import { DemoGnosisClient } from './demo/client'
import { HttpGnosisClient } from './http'

export * from './types'
export { DemoGnosisClient } from './demo/client'
export { demoStore } from './demo/store'
export { DEMO_SUGGESTIONS } from './demo/corpus'

export function isLiveApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GNOSIS_API)
}

export function createGnosisClient(
  getAccessToken: () => string | null
): import('./types').GnosisClient {
  if (isLiveApiConfigured()) {
    return new HttpGnosisClient({
      baseUrl: process.env.NEXT_PUBLIC_GNOSIS_API!,
      getAccessToken,
    })
  }
  return new DemoGnosisClient()
}
