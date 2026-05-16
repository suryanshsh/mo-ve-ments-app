'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileUploadZone } from '@/components/document/FileUploadZone'
import Toast from '@/components/ui/Toast'
import { useAutosave } from '@/hooks/useAutosave'
import { trpc } from '@/lib/trpc/client'
import type { MomentEmotion } from '@/lib/supabase/types'
import {
  usePresentationStore,
  type PresentationMoment,
  type PresentationSummary,
  type SourceCitation,
} from '@/stores/presentation'
import ArcBar from './ArcBar'
import MomentList from './MomentList'
import TopBar from './TopBar'

const PROGRESS_MESSAGES = [
  'Reading your sources…',
  'Mapping the narrative arc…',
  'Crafting each moment…',
  'Writing your scripts…',
]

const VALID_EMOTIONS: MomentEmotion[] = ['hook', 'empathy', 'build', 'reveal', 'proof', 'close']

type WorkspaceMomentRecord = {
  id: string
  presentation_id?: string | null
  position: number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: unknown
  script: string
  sources: unknown
  created_at?: string
  updated_at?: string
  _warning?: unknown
  _sourceVerification?: unknown
}

type WorkspacePresentationRecord = {
  id: string
  title: string
  audience: string | null
  target_duration: string | null
  total_duration: string | null
  status: string
  tips?: string[] | null
  created_at?: string
  updated_at?: string
  moments?: WorkspaceMomentRecord[]
}

const normalizeEmotion = (emotion: string): MomentEmotion => {
  if (VALID_EMOTIONS.includes(emotion as MomentEmotion)) {
    return emotion as MomentEmotion
  }

  return 'build'
}

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

const normalizeSources = (value: unknown): SourceCitation[] => {
  if (!Array.isArray(value)) return []

  const sources: SourceCitation[] = []

  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      sources.push(item.trim())
    } else if (typeof item === 'object' && item !== null) {
      sources.push(item as Record<string, unknown>)
    }
  }

  return sources
}

const normalizeVerification = (value: unknown): PresentationMoment['_sourceVerification'] => {
  if (typeof value !== 'object' || value === null) return undefined

  const record = value as Record<string, unknown>
  const verified = typeof record.verified === 'boolean' ? record.verified : false
  const verifiedSources = normalizeStringArray(record.verifiedSources)

  return { verified, verifiedSources }
}

const normalizeMoment = (
  moment: WorkspaceMomentRecord,
  presentationId: string,
  fallbackPosition: number
): PresentationMoment => {
  const duration = Number(moment.duration_seconds)
  const position = Number(moment.position)

  return {
    id: moment.id,
    presentation_id: moment.presentation_id ?? presentationId,
    position: Number.isFinite(position) && position > 0 ? position : fallbackPosition,
    title: moment.title || `Moment ${fallbackPosition}`,
    emotion: normalizeEmotion(moment.emotion),
    duration_seconds: Number.isFinite(duration) && duration > 0 ? duration : 60,
    slide_heading: typeof moment.slide_heading === 'string' ? moment.slide_heading : null,
    slide_bullets: normalizeStringArray(moment.slide_bullets),
    script: typeof moment.script === 'string' ? moment.script : '',
    sources: normalizeSources(moment.sources),
    created_at: moment.created_at,
    updated_at: moment.updated_at,
    _warning: typeof moment._warning === 'string' ? moment._warning : undefined,
    _sourceVerification: normalizeVerification(moment._sourceVerification),
  }
}

const toPresentationSummary = (presentation: WorkspacePresentationRecord): PresentationSummary => ({
  id: presentation.id,
  title: presentation.title,
  audience: presentation.audience,
  target_duration: presentation.target_duration,
  total_duration: presentation.total_duration,
  status: presentation.status,
  tips: presentation.tips,
  created_at: presentation.created_at,
  updated_at: presentation.updated_at,
})

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

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </main>
  )
}

function GenerationProgress({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-bg">
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <h1 className="mb-2 font-serif text-3xl text-text">Generating moments</h1>
          <p className="text-textMid animate-pulse">{message}</p>
        </div>
      </div>
    </main>
  )
}

function ErrorState({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="mb-2 font-serif text-2xl text-text">Workspace unavailable</h1>
        <p className="mb-5 text-sm leading-6 text-textMid">
          We could not load this presentation just now. Your dashboard is still available.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="rounded-[10px] bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRetrying ? 'Trying again…' : 'Try again'}
        </button>
      </div>
    </main>
  )
}

function DraftWorkspace({
  presentationId,
  onGenerate,
  isGenerating,
}: {
  presentationId: string
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <main className="min-h-screen bg-bg">
      <TopBar />
      <ArcBar />
      <section className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-serif text-2xl text-text">Source documents</h2>
            <p className="mt-2 mb-5 text-sm leading-6 text-textMid">
              Add PDFs, docs, notes, or research files before generating the first storyboard.
            </p>
            <FileUploadZone presentationId={presentationId} />
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-textLight">Draft</span>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-text">Ready to shape the narrative</h2>
            <p className="mt-3 text-sm leading-6 text-textMid">
              Generate the first set of moments when your brief and source files are ready.
            </p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="mt-6 w-full rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? 'Generating…' : 'Generate moments'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function AgentSidebarPlaceholder() {
  const moments = usePresentationStore((state) => state.moments)
  const activeMomentIndex = usePresentationStore((state) => state.activeMomentIndex)
  const activeMoment = activeMomentIndex !== null ? moments[activeMomentIndex] : null

  return (
    <aside className="h-fit rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-[132px]">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textLight">Agent</p>
        <h2 className="mt-1 font-serif text-2xl text-text">AI co-director</h2>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl bg-bgAlt p-4">
          <p className="text-sm leading-6 text-textMid">
            {activeMoment
              ? `Focused on “${activeMoment.title}”.`
              : 'Select a moment to focus the conversation.'}
          </p>
        </div>
        <div className="min-h-[260px] rounded-xl border border-border-light bg-bg p-4" />
        <div className="flex items-center gap-2 rounded-[12px] border border-border bg-bg px-3 py-2.5">
          <span className="flex-1 text-sm text-textLight">Ask for a revision…</span>
          <button
            type="button"
            disabled
            className="rounded-[9px] bg-border px-3 py-1.5 text-xs font-semibold text-textLight disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  )
}

function WorkspaceShell() {
  return (
    <main className="min-h-screen bg-bg">
      <TopBar />
      <ArcBar />
      <section className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
          <MomentList />
          <AgentSidebarPlaceholder />
        </div>
      </section>
      <Toast />
    </main>
  )
}

export default function WorkspaceClient({ presentationId }: { presentationId: string }) {
  useAutosave()

  const [generationFailed, setGenerationFailed] = useState(false)
  const [hydratedPresentationId, setHydratedPresentationId] = useState<string | null>(null)
  const setPresentation = usePresentationStore((state) => state.setPresentation)
  const setMoments = usePresentationStore((state) => state.setMoments)
  const setActiveMoment = usePresentationStore((state) => state.setActiveMoment)
  const hasDirtyMoments = usePresentationStore((state) => state.dirtyMomentIds.size > 0)
  const localMomentCount = usePresentationStore((state) => state.moments.length)

  const presentationQuery = trpc.presentation.getById.useQuery({ id: presentationId })
  const generationMutation = trpc.generation.create.useMutation({
    onSuccess: async () => {
      setGenerationFailed(false)
      await presentationQuery.refetch()
    },
    onError: () => setGenerationFailed(true),
  })
  const progressMessage = useProgressMessage(generationMutation.isPending)

  const normalizedWorkspace = useMemo(() => {
    const presentation = presentationQuery.data as WorkspacePresentationRecord | undefined
    if (!presentation) return null

    return {
      presentation: toPresentationSummary(presentation),
      moments: [...(presentation.moments ?? [])]
        .sort((first, second) => first.position - second.position)
        .map((moment, index) => normalizeMoment(moment, presentation.id, index + 1)),
    }
  }, [presentationQuery.data])

  useEffect(() => {
    if (!normalizedWorkspace) return

    setPresentation(normalizedWorkspace.presentation)

    const shouldHydrateMoments =
      hydratedPresentationId !== normalizedWorkspace.presentation.id ||
      (!hasDirtyMoments && localMomentCount === 0 && normalizedWorkspace.moments.length > 0)

    if (shouldHydrateMoments) {
      setMoments(normalizedWorkspace.moments)
      setActiveMoment(null)
    }

    setHydratedPresentationId(normalizedWorkspace.presentation.id)
  }, [
    hasDirtyMoments,
    hydratedPresentationId,
    localMomentCount,
    normalizedWorkspace,
    setActiveMoment,
    setMoments,
    setPresentation,
  ])

  const handleGenerate = () => {
    setGenerationFailed(false)
    generationMutation.mutate({ presentationId })
  }

  if (presentationQuery.isLoading) {
    return <LoadingState />
  }

  if (presentationQuery.isError || !normalizedWorkspace) {
    return <ErrorState onRetry={() => presentationQuery.refetch()} isRetrying={presentationQuery.isFetching} />
  }

  if (generationMutation.isPending) {
    return <GenerationProgress message={progressMessage} />
  }

  if (generationFailed) {
    return <ErrorState onRetry={handleGenerate} isRetrying={generationMutation.isPending} />
  }

  if (hydratedPresentationId !== normalizedWorkspace.presentation.id) {
    return <LoadingState />
  }

  const shouldShowGenerate = normalizedWorkspace.presentation.status === 'draft' || normalizedWorkspace.moments.length === 0

  if (shouldShowGenerate) {
    return (
      <DraftWorkspace
        presentationId={presentationId}
        onGenerate={handleGenerate}
        isGenerating={generationMutation.isPending}
      />
    )
  }

  return <WorkspaceShell />
}