import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

let anthropicClient: Anthropic | null = null

export const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  anthropicClient ??= new Anthropic({
    apiKey,
    maxRetries: 0,
  })

  return anthropicClient
}
