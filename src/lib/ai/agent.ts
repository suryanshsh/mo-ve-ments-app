import 'server-only'

import { APIError } from '@anthropic-ai/sdk'
import type { MessageParam, MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages'

import { anthropic } from './client'

const AGENT_MODEL = process.env.ANTHROPIC_AGENT_MODEL ?? 'claude-haiku-4-5-20251001'
const RETRY_DELAY_MS = 1000

export type AgentChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

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

const errorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

const buildAnthropicError = (operation: string, error: unknown, retried: boolean) => {
  const status = getStatus(error)
  const statusText = status ? ` status ${status}` : 'unknown status'
  const retryText = retried ? ' after retry' : ''

  return new Error(`${operation} failed${retryText} (${statusText}): ${errorMessage(error)}`)
}

const getTextDelta = (event: MessageStreamEvent) => {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    return event.delta.text
  }

  return null
}

const toAnthropicMessages = (messages: AgentChatMessage[]): MessageParam[] =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))

export async function* agentChat(
  systemPrompt: string,
  messages: AgentChatMessage[],
): AsyncGenerator<string> {
  let attempt = 0
  let yieldedText = false

  while (attempt < 2) {
    try {
      const stream = anthropic.messages.stream({
        model: AGENT_MODEL,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: toAnthropicMessages(messages),
      })

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

      throw buildAnthropicError('Anthropic agent chat request', error, attempt > 0)
    }
  }
}