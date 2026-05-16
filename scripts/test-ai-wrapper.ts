import { APIError } from '@anthropic-ai/sdk'
import type { MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type TestMode = 'all' | 'retry' | 'stream'

const loadAi = () => import('../src/lib/ai')

type AiModule = Awaited<ReturnType<typeof loadAi>>

type StreamResult = {
  text: string
  chunks: number
  chars: number
  elapsedMs: number
}

const parseMode = (): TestMode => {
  const mode = process.argv[2] ?? 'all'

  if (mode === 'all' || mode === 'retry' || mode === 'stream') {
    return mode
  }

  throw new Error(`Unknown mode "${mode}". Use one of: all, retry, stream.`)
}

const parseEnvValue = (value: string) => {
  const trimmed = value.trim()
  const quote = trimmed[0]

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

const loadEnvLocal = () => {
  const envPath = resolve(process.cwd(), '.env.local')

  if (!existsSync(envPath)) {
    return
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

    if (!match) {
      continue
    }

    const [, key, value] = match

    if (process.env[key] === undefined) {
      process.env[key] = parseEnvValue(value)
    }
  }
}

const requireAnthropicKey = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in the shell or .env.local')
  }
}

const collectText = async (stream: AsyncGenerator<string>): Promise<StreamResult> => {
  const chunks: string[] = []
  const startedAt = Date.now()

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  const text = chunks.join('')

  return {
    text,
    chunks: chunks.length,
    chars: text.length,
    elapsedMs: Date.now() - startedAt,
  }
}

const fakeTextStream = async function* (chunks: string[]): AsyncGenerator<MessageStreamEvent> {
  for (const text of chunks) {
    yield {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'text_delta',
        text,
      },
    } as MessageStreamEvent
  }
}

const forcedApiError = () =>
  new APIError(500, { message: 'Forced retry smoke-test error' }, 'Forced retry smoke-test error', new Headers())

const runGenerationStreamSmoke = async (ai: AiModule) => {
  const prompt = `Target duration: 300 seconds.
Audience: internal product and customer success team.
Topic: adopting a weekly customer insight review.
Source documents: none.
Create exactly 5 concise moments. Keep each script under 25 words and use empty sources arrays.`

  const result = await collectText(ai.generateMoments(prompt))
  assert.ok(result.chunks > 0, 'generation should yield at least one streamed chunk')
  assert.ok(result.chars > 0, 'generation should yield text')

  const parsed = JSON.parse(result.text) as unknown
  assert.ok(Array.isArray(parsed), 'generation output should parse as a JSON array')
  assert.ok(parsed.length >= 5, 'generation output should contain moments')

  console.info('stream smoke ok', {
    chunks: result.chunks,
    chars: result.chars,
    elapsedMs: result.elapsedMs,
    moments: parsed.length,
  })
}

const runGenerationRetrySmoke = async (ai: AiModule) => {
  const messages = ai.anthropic.messages as unknown as {
    stream: (...args: unknown[]) => AsyncIterable<MessageStreamEvent>
  }
  const originalStream = messages.stream
  let attempts = 0

  messages.stream = () => {
    attempts += 1

    if (attempts === 1) {
      throw forcedApiError()
    }

    return fakeTextStream(['generation ', 'retry ', 'ok'])
  }

  try {
    const result = await collectText(ai.generateMoments('forced retry test'))

    assert.equal(attempts, 2, 'generation retry should call Anthropic twice')
    assert.equal(result.text, 'generation retry ok')
    assert.ok(result.elapsedMs >= 900, 'generation retry should wait about one second before retrying')

    console.info('generation retry smoke ok', {
      attempts,
      elapsedMs: result.elapsedMs,
      text: result.text,
    })
  } finally {
    messages.stream = originalStream
  }
}

const runAgentRetrySmoke = async (ai: AiModule) => {
  const messages = ai.anthropic.messages as unknown as {
    stream: (...args: unknown[]) => AsyncIterable<MessageStreamEvent>
  }
  const originalStream = messages.stream
  let attempts = 0

  messages.stream = () => {
    attempts += 1

    if (attempts === 1) {
      throw forcedApiError()
    }

    return fakeTextStream(['agent ', 'retry ', 'ok'])
  }

  try {
    const result = await collectText(
      ai.agentChat('You are a short test assistant.', [{ role: 'user', content: 'Say ok.' }]),
    )

    assert.equal(attempts, 2, 'agent retry should call Anthropic twice')
    assert.equal(result.text, 'agent retry ok')
    assert.ok(result.elapsedMs >= 900, 'agent retry should wait about one second before retrying')

    console.info('agent retry smoke ok', {
      attempts,
      elapsedMs: result.elapsedMs,
      text: result.text,
    })
  } finally {
    messages.stream = originalStream
  }
}

const main = async () => {
  loadEnvLocal()

  const mode = parseMode()

  if (mode === 'retry' && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = 'test-key-for-mocked-retry'
  } else {
    requireAnthropicKey()
  }

  const ai = await loadAi()

  if (mode === 'all' || mode === 'retry') {
    await runGenerationRetrySmoke(ai)
    await runAgentRetrySmoke(ai)
  }

  if (mode === 'all' || mode === 'stream') {
    await runGenerationStreamSmoke(ai)
  }
}

main().catch((error: unknown) => {
  console.error('AI wrapper smoke test failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
