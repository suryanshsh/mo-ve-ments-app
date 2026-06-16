export const AI_REQUEST_TIMEOUT_MS = 52_000

type AIServiceErrorOptions = {
  operation: string
  status?: number
  retried: boolean
  cause: unknown
}

export class AIServiceError extends Error {
  readonly provider = 'anthropic'
  readonly operation: string
  readonly status?: number
  readonly retried: boolean
  readonly cause: unknown

  constructor({ operation, status, retried, cause }: AIServiceErrorOptions) {
    const statusText = status ? `status ${status}` : 'unknown status'
    const retryText = retried ? ' after retry' : ''

    super(`${operation} failed${retryText} (${statusText})`)
    this.name = 'AIServiceError'
    this.operation = operation
    this.status = status
    this.retried = retried
    this.cause = cause
  }
}

export class GenerationTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs = AI_REQUEST_TIMEOUT_MS) {
    super(`AI generation timed out after ${timeoutMs}ms`)
    this.name = 'GenerationTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export const isAIServiceError = (error: unknown): error is AIServiceError =>
  error instanceof AIServiceError ||
  (typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AIServiceError' &&
    (error as { provider?: unknown }).provider === 'anthropic')

export const isGenerationTimeoutError = (error: unknown): error is GenerationTimeoutError =>
  error instanceof GenerationTimeoutError ||
  (typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'GenerationTimeoutError')