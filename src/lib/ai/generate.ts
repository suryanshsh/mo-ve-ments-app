import 'server-only'

import { APIError } from '@anthropic-ai/sdk'
import type { MessageStreamEvent, TextBlockParam } from '@anthropic-ai/sdk/resources/messages'

import { getAnthropicClient } from './client'
import { AIServiceError } from './errors'
import { GENERATION_SYSTEM_PROMPT } from './prompts'

const GENERATION_MODEL = 'claude-sonnet-4-20250514'
const RETRY_DELAY_MS = 1000
const PROMPT_CACHING_BETA = 'prompt-caching-2024-07-31'

const cacheableSystemPrompt = (prompt: string): TextBlockParam[] => [
  {
    type: 'text',
    text: prompt,
    cache_control: { type: 'ephemeral' },
  },
]

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const getStatus = (error: unknown) => {
  if (error instanceof APIError) {
    return error.status
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : undefined
  }

  return undefined
}

const isRetryableError = (error: unknown) => {
  const status = getStatus(error)
  return status === 429 || status === 500
}

const buildAnthropicError = (operation: string, error: unknown, retried: boolean) => {
  const status = getStatus(error)
  return new AIServiceError({ operation, status, retried, cause: error })
}

const getTextDelta = (event: MessageStreamEvent) => {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    return event.delta.text
  }

  return null
}

export async function* generateMoments(prompt: string): AsyncGenerator<string> {
  let attempt = 0
  let yieldedText = false

  while (attempt < 2) {
    try {
      const stream = getAnthropicClient().messages.stream(
        {
          model: GENERATION_MODEL,
          max_tokens: 4096,
          temperature: 0.7,
          system: cacheableSystemPrompt(GENERATION_SYSTEM_PROMPT),
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'anthropic-beta': PROMPT_CACHING_BETA,
          },
        },
      )

      for await (const event of stream) {
        const text = getTextDelta(event)

        if (text) {
          yieldedText = true
          yield text
        }
      }

      return
    } catch (error) {
      if (attempt === 0 && !yieldedText && isRetryableError(error)) {
        attempt += 1
        await wait(RETRY_DELAY_MS)
        continue
      }

      throw buildAnthropicError('Anthropic generation request', error, attempt > 0)
    }
  }
}