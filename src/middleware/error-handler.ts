import 'server-only'

import { createHash } from 'crypto'
import * as Sentry from '@sentry/nextjs'
import { TRPCError, type TRPC_ERROR_CODE_KEY } from '@trpc/server'
import {
  isAIServiceError,
  isGenerationTimeoutError,
  type AIServiceError,
  type GenerationTimeoutError,
} from '@/lib/ai/errors'

export type ErrorHandlerContext = {
  path: string
  type: string
  requestPath?: string
  user?: {
    id: string
    email?: string | null
  } | null
}

export type GenerationPartialResult = {
  presentationId: string
  createdCount: number
  expectedCount: number
}

export class PartialGenerationError extends Error {
  readonly partialResult: GenerationPartialResult

  constructor(message: string, partialResult: GenerationPartialResult) {
    super(message)
    this.name = 'PartialGenerationError'
    this.partialResult = partialResult
  }
}

const AI_BUSY_MESSAGE = 'Our AI service is temporarily busy. Please try again in a moment.'
const AI_FAILURE_MESSAGE = 'Something went wrong with generation. Please try again.'
const AI_TIMEOUT_MESSAGE = 'Generation took too long. Try with a shorter presentation or fewer source documents.'
const PARTIAL_GENERATION_MESSAGE = 'Generation finished with partial results. You can keep editing the saved moments or try again.'
const SAVE_FAILURE_MESSAGE = "We're having trouble saving your changes. Please try again."
const LOAD_FAILURE_MESSAGE = "We're having trouble loading your data. Please try again."
const GENERIC_FAILURE_MESSAGE = 'Something went wrong. Please try again.'

const capturedErrors = new WeakSet<object>()

const safeMessagePatterns = [
  /^Free plan allows 2 presentations\./,
  /^You've used all \d+ of your free daily generations\./,
  /^File is too large\./,
  /^Unsupported file type\./,
  /^File content does not match its extension\./,
  /^Invalid file upload$/,
  /^Presentation not found$/,
  /^Moment not found$/,
  /^Moment not found or not editable$/,
  /^Document not found$/,
  /^Generate moments before exporting\.$/,
  /^Billing is not configured yet\./,
  /^Could not create checkout\./,
  /^Could not load customer portal\./,
  /^No active subscription$/,
  /^Please sign in to continue\.$/,
  /^Please check the submitted fields and try again\.$/,
  /^You do not have access to this action\.$/,
  /^Please slow down and try again in a moment\.$/,
  /^Our AI service is temporarily busy\./,
  /^Something went wrong with generation\./,
  /^Generation took too long\./,
  /^Generation finished with partial results\./,
  /^We're having trouble saving your changes\./,
  /^We're having trouble loading your data\./,
]

const isKnownSafeMessage = (message: string) =>
  safeMessagePatterns.some((pattern) => pattern.test(message))

const hashValue = (value?: string | null) => {
  if (!value) {
    return undefined
  }

  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

const getCause = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('cause' in error)) {
    return undefined
  }

  return (error as { cause?: unknown }).cause
}

const findCause = <T>(
  error: unknown,
  predicate: (candidate: unknown) => candidate is T,
  seen = new WeakSet<object>()
): T | undefined => {
  if (predicate(error)) {
    return error
  }

  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  if (seen.has(error)) {
    return undefined
  }

  seen.add(error)

  return findCause(getCause(error), predicate, seen)
}

const isPartialGenerationError = (error: unknown): error is PartialGenerationError =>
  error instanceof PartialGenerationError ||
  (typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'PartialGenerationError' &&
    typeof (error as { partialResult?: unknown }).partialResult === 'object')

export const createPartialGenerationTRPCError = (
  partialResult: GenerationPartialResult,
  message = PARTIAL_GENERATION_MESSAGE
) =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message,
    cause: new PartialGenerationError(message, partialResult),
  })

export const getPartialResultFromError = (error: unknown) =>
  findCause(error, isPartialGenerationError)?.partialResult

const getAIError = (error: unknown): AIServiceError | undefined =>
  findCause(error, isAIServiceError)

const getTimeoutError = (error: unknown): GenerationTimeoutError | undefined =>
  findCause(error, isGenerationTimeoutError)

const getTRPCCode = (error: unknown): TRPC_ERROR_CODE_KEY => {
  if (getTimeoutError(error)) {
    return 'TIMEOUT'
  }

  const aiError = getAIError(error)

  if (aiError?.status === 429) {
    return 'TOO_MANY_REQUESTS'
  }

  if (error instanceof TRPCError) {
    return error.code
  }

  return 'INTERNAL_SERVER_ERROR'
}

export const getSafeClientMessage = (
  error: unknown,
  context: Partial<ErrorHandlerContext> = {}
) => {
  const aiError = getAIError(error)

  if (aiError?.status === 429) {
    return AI_BUSY_MESSAGE
  }

  if (aiError?.status === 500 || (aiError?.status !== undefined && aiError.status >= 500)) {
    return AI_FAILURE_MESSAGE
  }

  if (aiError) {
    return AI_FAILURE_MESSAGE
  }

  if (getTimeoutError(error)) {
    return AI_TIMEOUT_MESSAGE
  }

  if (getPartialResultFromError(error)) {
    return PARTIAL_GENERATION_MESSAGE
  }

  if (error instanceof TRPCError && isKnownSafeMessage(error.message)) {
    return error.message
  }

  if (error instanceof TRPCError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Please sign in to continue.'
      case 'BAD_REQUEST':
        return 'Please check the submitted fields and try again.'
      case 'FORBIDDEN':
        return 'You do not have access to this action.'
      case 'NOT_FOUND':
        return 'The requested item could not be found.'
      case 'TOO_MANY_REQUESTS':
        return 'Please slow down and try again in a moment.'
      case 'INTERNAL_SERVER_ERROR':
        return context.type === 'query' ? LOAD_FAILURE_MESSAGE : SAVE_FAILURE_MESSAGE
      default:
        return GENERIC_FAILURE_MESSAGE
    }
  }

  return context.type === 'query' ? LOAD_FAILURE_MESSAGE : GENERIC_FAILURE_MESSAGE
}

const getErrorDiagnostics = (error: unknown) => {
  const aiError = getAIError(error)
  const timeoutError = getTimeoutError(error)
  const partialResult = getPartialResultFromError(error)

  return {
    trpcCode: getTRPCCode(error),
    errorName: error instanceof Error ? error.name : typeof error,
    aiProvider: aiError?.provider,
    aiOperation: aiError?.operation,
    aiStatus: aiError?.status,
    aiRetried: aiError?.retried,
    timeoutMs: timeoutError?.timeoutMs,
    partialCreatedCount: partialResult?.createdCount,
    partialExpectedCount: partialResult?.expectedCount,
  }
}

export const captureTRPCError = (error: unknown, context: ErrorHandlerContext) => {
  if (typeof error === 'object' && error !== null) {
    if (capturedErrors.has(error)) {
      return
    }

    capturedErrors.add(error)
  }

  Sentry.withScope((scope) => {
    scope.setTag('trpc.path', context.path)
    scope.setTag('trpc.type', context.type)

    if (context.requestPath) {
      scope.setTag('request.path', context.requestPath)
    }

    const userIdHash = hashValue(context.user?.id)
    const emailHash = hashValue(context.user?.email)

    if (userIdHash || emailHash) {
      scope.setUser({
        id: userIdHash,
        username: emailHash,
      })
    }

    scope.setContext('trpc_error', getErrorDiagnostics(error))
    Sentry.captureException(error)
  })
}

export const toClientTRPCError = (error: unknown, context: ErrorHandlerContext) => {
  captureTRPCError(error, context)

  return new TRPCError({
    code: getTRPCCode(error),
    message: getSafeClientMessage(error, context),
    cause: error,
  })
}