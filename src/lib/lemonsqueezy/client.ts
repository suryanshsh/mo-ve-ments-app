import 'server-only'
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

export const lemonSqueezy = lemonSqueezySetup({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY,
})