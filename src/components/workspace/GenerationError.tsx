'use client'

export type GenerationPartialResult = {
  presentationId?: string
  createdCount: number
  expectedCount?: number
}

type GenerationErrorProps = {
  message: string
  onRetry: () => void
  isRetrying: boolean
  partialResult?: GenerationPartialResult | null
  mode?: 'page' | 'banner'
}

const isTimeoutMessage = (message: string) =>
  /took too long|shorter presentation|fewer source documents|timeout/i.test(message)

const getPartialText = (partialResult: GenerationPartialResult) => {
  const expectedCount = partialResult.expectedCount ?? partialResult.createdCount

  return `Generation incomplete — ${partialResult.createdCount} of ${expectedCount} moments created.`
}

export default function GenerationError({
  message,
  onRetry,
  isRetrying,
  partialResult,
  mode = 'page',
}: GenerationErrorProps) {
  const content = (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-red-950">Generation paused</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{message}</p>

          {isTimeoutMessage(message) && (
            <p className="mt-3 text-sm leading-6 text-red-800">
              Reduce the number of source documents or shorten the target duration before trying again.
            </p>
          )}

          {partialResult && partialResult.createdCount > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              {getPartialText(partialResult)}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="shrink-0 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRetrying ? 'Trying again...' : 'Try again'}
        </button>
      </div>
    </div>
  )

  if (mode === 'banner') {
    return content
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-2xl">{content}</div>
    </main>
  )
}