import 'server-only'
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

let configuredApiKey: string | null = null

export const setupLemonSqueezy = (apiKey: string) => {
  if (configuredApiKey === apiKey) {
    return
  }

  lemonSqueezySetup({ apiKey })
  configuredApiKey = apiKey
}