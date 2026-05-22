import 'server-only'

import { AI_REQUEST_TIMEOUT_MS, GenerationTimeoutError } from './errors'

const withTimeout = async <T>(promise: Promise<T>, waitMs: number, timeoutMs: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new GenerationTimeoutError(timeoutMs)), waitMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export const collectTextStream = async (
  stream: AsyncGenerator<string>,
  timeoutMs = AI_REQUEST_TIMEOUT_MS
) => {
  const chunks: string[] = []
  const startedAt = Date.now()
  const iterator = stream[Symbol.asyncIterator]()

  try {
    while (true) {
      const remainingMs = timeoutMs - (Date.now() - startedAt)

      if (remainingMs <= 0) {
        throw new GenerationTimeoutError(timeoutMs)
      }

      const result = await withTimeout(iterator.next(), remainingMs, timeoutMs)

      if (result.done) {
        break
      }

      chunks.push(result.value)
    }
  } catch (error) {
    await iterator.return?.(undefined)
    throw error
  }

  return chunks.join('')
}