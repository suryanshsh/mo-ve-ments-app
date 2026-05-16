'use client'

import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { FileUploadZone } from '@/components/document/FileUploadZone'

const PROGRESS_MESSAGES = [
  'Reading your sources…',
  'Mapping the narrative arc…',
  'Crafting each moment…',
  'Writing your scripts…',
]

type WorkspaceMoment = {
  id: string
  position: number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: string[] | null
  script: string
  sources: unknown[] | null
  _warning?: string
}

type WorkspacePresentation = {
  id: string
  title: string
  audience: string | null
  target_duration: string | null
  total_duration: string | null
  status: string
  tips: string[] | null
  moments: WorkspaceMoment[]
}

function useProgressMessage(active: boolean) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setIndex((current) => (current + 1) % PROGRESS_MESSAGES.length)
    }, 1800)

    return () => window.clearInterval(intervalId)
  }, [active])

  return PROGRESS_MESSAGES[index]
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) return `${remainingSeconds}s`
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

function sourceLabel(source: unknown) {
  if (typeof source === 'string') return source

  if (typeof source === 'object' && source !== null) {
    const record = source as Record<string, unknown>
    const filename = typeof record.filename === 'string' ? record.filename : ''
    const reference = typeof record.reference === 'string' ? record.reference : ''
    const label = typeof record.label === 'string' ? record.label : ''
    return [filename, reference, label].filter(Boolean).join(' ')
  }

  return ''
}

function GenerationProgress({ message }: { message: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <h1 className="font-serif text-3xl text-text mb-2">Generating moments</h1>
        <p className="text-textMid animate-pulse">{message}</p>
      </div>
    </div>
  )
}

function ErrorState({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="bg-surface border border-border rounded-xl p-6 max-w-md text-center shadow-sm">
        <h1 className="font-serif text-2xl text-text mb-2">Generation hit a snag</h1>
        <p className="text-sm text-textMid mb-5">
          We could not generate your moments just now. Your presentation and uploaded files are still saved.
        </p>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="px-4 py-2.5 rounded-[10px] bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {isRetrying ? 'Trying again…' : 'Try again'}
        </button>
      </div>
    </div>
  )
}

function MomentCard({ moment }: { moment: WorkspaceMoment }) {
  const sources = (moment.sources ?? []).map(sourceLabel).filter(Boolean)

  return (
    <article className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-textLight">Moment {moment.position}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent-text capitalize">
              {moment.emotion}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bgAlt text-textMid">
              {formatDuration(moment.duration_seconds)}
            </span>
          </div>
          <h2 className="font-serif text-2xl text-text">{moment.title}</h2>
        </div>
      </div>

      {moment._warning && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {moment._warning}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-textLight mb-2">Slide</p>
          <div className="rounded-lg border border-border-light bg-bg p-4">
            <h3 className="font-medium text-text mb-3">{moment.slide_heading}</h3>
            {moment.slide_bullets && moment.slide_bullets.length > 0 && (
              <ul className="space-y-2 text-sm text-textMid">
                {moment.slide_bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-textLight mb-2">Script</p>
          <p className="text-sm leading-7 text-textMid whitespace-pre-wrap">{moment.script}</p>
        </section>
      </div>

      {sources.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {sources.map((source) => (
            <span key={source} className="text-xs px-2.5 py-1 rounded-full bg-bgAlt text-textMid">
              {source}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

export default function WorkspaceClient({ presentationId }: { presentationId: string }) {
  const [generationFailed, setGenerationFailed] = useState(false)
  const presentationQuery = trpc.presentation.getById.useQuery({ id: presentationId })
  const generationMutation = trpc.generation.create.useMutation({
    onSuccess: async () => {
      setGenerationFailed(false)
      await presentationQuery.refetch()
    },
    onError: () => setGenerationFailed(true),
  })
  const progressMessage = useProgressMessage(generationMutation.isPending)
  const presentation = presentationQuery.data as WorkspacePresentation | undefined
  const moments = useMemo(
    () => [...(presentation?.moments ?? [])].sort((a, b) => a.position - b.position),
    [presentation?.moments]
  )
  const shouldShowGenerate = presentation?.status === 'draft' || moments.length === 0

  const handleGenerate = () => {
    setGenerationFailed(false)
    generationMutation.mutate({ presentationId })
  }

  if (presentationQuery.isLoading) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (presentationQuery.isError || !presentation) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="bg-surface border border-border rounded-xl p-6 max-w-md text-center shadow-sm">
          <h1 className="font-serif text-2xl text-text mb-2">Presentation unavailable</h1>
          <p className="text-sm text-textMid">We could not load this workspace. Please return to the dashboard and try again.</p>
        </div>
      </main>
    )
  }

  if (generationMutation.isPending) {
    return <main className="min-h-screen bg-bg"><GenerationProgress message={progressMessage} /></main>
  }

  if (generationFailed) {
    return (
      <main className="min-h-screen bg-bg">
        <ErrorState onRetry={handleGenerate} isRetrying={generationMutation.isPending} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/dashboard" className="text-sm text-textMid hover:text-text transition-colors">
              ← Dashboard
            </a>
            <h1 className="font-serif text-3xl text-text mt-2">{presentation.title}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {presentation.audience && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-bgAlt text-textMid">
                  {presentation.audience}
                </span>
              )}
              {presentation.target_duration && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-bgAlt text-textMid">
                  Target: {presentation.target_duration}
                </span>
              )}
              {presentation.total_duration && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-bgAlt text-textMid">
                  Generated: {presentation.total_duration}
                </span>
              )}
            </div>
          </div>

          {shouldShowGenerate && (
            <button
              onClick={handleGenerate}
              disabled={generationMutation.isPending}
              className="px-4 py-2.5 rounded-[10px] bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              Generate
            </button>
          )}
        </div>
      </header>

      {shouldShowGenerate ? (
        <section className="max-w-3xl mx-auto px-6 py-12 space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h2 className="font-serif text-2xl text-text mb-2">Source documents</h2>
            <p className="text-sm text-textMid mb-5">
              Upload PDFs, docs, notes, or research files before generating your moments.
            </p>
            <FileUploadZone presentationId={presentation.id} />
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 text-center shadow-sm">
            <h2 className="font-serif text-3xl text-text mb-3">Ready to shape the narrative</h2>
            <p className="text-textMid mb-6">
              Generate the first set of moments when your presentation brief and source files are ready.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generationMutation.isPending}
              className="px-5 py-3 rounded-[10px] bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              Generate moments
            </button>
          </div>
        </section>
      ) : (
        <section className="max-w-6xl mx-auto px-6 py-8 space-y-4">
          {moments.map((moment) => (
            <MomentCard key={moment.id} moment={moment} />
          ))}
        </section>
      )}
    </main>
  )
}