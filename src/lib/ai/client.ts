import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not configured')
}

export const anthropic = new Anthropic({
  apiKey,
  maxRetries: 0,
})
