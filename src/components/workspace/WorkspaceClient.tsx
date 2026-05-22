'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  type SourceVerificationStatus,
} from '@/stores/presentation'
import AgentSidebar from './AgentSidebar'
import ArcBar from './ArcBar'
import GenerationError, { type GenerationPartialResult } from './GenerationError'
import MomentList from './MomentList'
import TopBar from './TopBar'

const PROGRESS_MESSAGES = [
  'Reading your sources…',
  'Mapping the narrative arc…',
  'Crafting each moment…',
  'Writing your scripts…',
]

const VALID_EMOTIONS: MomentEmotion[] = ['hook', 'empathy', 'build', 'reveal', 'proof', 'close']
const VALID_VERIFICATION_STATUSES: SourceVerificationStatus[] = ['verified', 'partial', 'uncited', 'clean']

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
  _verification?: unknown
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

type GenerationErrorState = {
  message: string
  partialResult?: GenerationPartialResult | null
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isVerificationMetadataSource = (source: unknown) =>
  isRecord(source) && source.type === 'verification'

const getVerificationMetadataSource = (value: unknown) => {
  if (!Array.isArray(value)) return undefined

  return value.find(isVerificationMetadataSource)
}

const normalizeSources = (value: unknown): SourceCitation[] => {
  if (!Array.isArray(value)) return []

  const sources: SourceCitation[] = []

  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      sources.push(item.trim())
    } else if (isRecord(item) && !isVerificationMetadataSource(item)) {
      sources.push(item)
    }
  }

  return sources
}

const normalizeVerification = (value: unknown): PresentationMoment['_verification'] => {
  if (!isRecord(value)) return undefined

  if (typeof value.verified === 'boolean') {
    return {
      status: value.verified ? 'verified' : 'partial',
      uncitedClaims: [],
    }
  }

  const status = typeof value.status === 'string' ? value.status : ''

  if (!VALID_VERIFICATION_STATUSES.includes(status as SourceVerificationStatus)) {
    return undefined
  }

  return {
    status: status as SourceVerificationStatus,
    uncitedClaims: normalizeStringArray(value.uncitedClaims),
  }
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
    _verification:
      normalizeVerification(moment._verification) ??
      normalizeVerification(getVerificationMetadataSource(moment.sources)) ??
      normalizeVerification(moment._sourceVerification),
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

const isGenerationPartialResult = (value: unknown): value is GenerationPartialResult => {
  if (!isRecord(value)) return false

  return typeof value.createdCount === 'number'
}

const getGenerationPartialResult = (error: unknown) => {
  if (!isRecord(error) || !isRecord(error.data)) return null

  const partialResult = error.data.partialResult
  return isGenerationPartialResult(partialResult) ? partialResult : null
}

const getGenerationErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong with generation. Please try again.'
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

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />
}

function MomentCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <SkeletonBlock className="h-9 w-9 rounded-full" />
          <div className="mt-3 h-28 w-px bg-border" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="mb-3 h-4 w-24 rounded-full" />
              <SkeletonBlock className="h-7 w-3/5" />
              <SkeletonBlock className="mt-3 h-4 w-4/5" />
            </div>
            <SkeletonBlock className="h-8 w-28 rounded-full" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
            <SkeletonBlock className="aspect-video rounded-xl" />
            <div className="space-y-3">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-11/12" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AgentSidebarLoadingSkeleton() {
  return (
    <aside className="hidden border-l border-border bg-surface px-4 py-5 lg:fixed lg:right-0 lg:top-[109px] lg:block lg:h-[calc(100vh-109px)] lg:w-[260px]">
      <SkeletonBlock className="mb-2 h-4 w-28" />
      <SkeletonBlock className="mb-6 h-3 w-44" />
      <div className="space-y-3">
        <SkeletonBlock className="h-14 w-4/5 rounded-2xl" />
        <SkeletonBlock className="ml-auto h-12 w-3/4 rounded-2xl" />
        <SkeletonBlock className="h-16 w-5/6 rounded-2xl" />
      </div>
      <div className="absolute bottom-5 left-4 right-4">
        <SkeletonBlock className="h-10 rounded-full" />
      </div>
    </aside>
  )
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-5 px-5 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <SkeletonBlock className="h-9 w-9 rounded-[10px]" />
            <div>
              <SkeletonBlock className="mb-3 h-5 w-56" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-6 w-16 rounded-full" />
                <SkeletonBlock className="hidden h-6 w-28 rounded-full sm:block" />
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <SkeletonBlock className="h-10 w-20 rounded-[10px]" />
            <SkeletonBlock className="h-10 w-24 rounded-[10px]" />
          </div>
        </div>
      </header>
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex h-9 max-w-[1440px] gap-1 px-5 lg:px-8">
          <SkeletonBlock className="h-9 w-2/12 rounded-none" />
          <SkeletonBlock className="h-9 w-3/12 rounded-none" />
          <SkeletonBlock className="h-9 w-2/12 rounded-none" />
          <SkeletonBlock className="h-9 w-5/12 rounded-none" />
        </div>
      </div>
      <section className="mx-auto max-w-[1440px] px-5 py-8 lg:pl-8 lg:pr-[284px]">
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <MomentCardSkeleton key={`moment-skeleton-${index}`} index={index} />
          ))}
        </div>
      </section>
      <AgentSidebarLoadingSkeleton />
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
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="mb-6 grid h-24 w-24 place-items-center rounded-2xl border border-border bg-surface shadow-sm">
            <div className="h-14 w-16 rounded-lg bg-[#1E293B] p-2 shadow-sm">
              <div className="mb-2 h-2 w-10 rounded-full bg-[#F59E0B]/70" />
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-white/40" />
                <div className="h-1.5 w-4/5 rounded-full bg-white/30" />
                <div className="h-1.5 w-2/3 rounded-full bg-white/25" />
              </div>
            </div>
          </div>
          <h2 className="font-serif text-4xl leading-tight text-text">Ready to generate</h2>
          <p className="mt-3 text-sm leading-6 text-textMid">
            Add any source documents you want the AI to cite, then create the first pass of moments.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="mt-6 rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : 'Generate my moments'}
          </button>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="font-serif text-2xl text-text">Source documents</h3>
          <p className="mt-2 mb-5 text-sm leading-6 text-textMid">
            Upload PDFs, docs, notes, or research files before generating if you want citations in the draft.
          </p>
          <FileUploadZone presentationId={presentationId} />
        </div>
      </section>
    </main>
  )
}

function WorkspaceShell({
  presentationId,
  generationError,
}: {
  presentationId: string
  generationError?: ReactNode
}) {
  return (
    <main className="min-h-screen bg-bg">
      <TopBar />
      <ArcBar />
      <section className="mx-auto max-w-[1440px] px-5 py-8 lg:pl-8 lg:pr-[284px]">
        <div className="grid gap-6">
          {generationError}
          <MomentList />
        </div>
      </section>
      <AgentSidebar presentationId={presentationId} />
      <Toast />
    </main>
  )
}

export default function WorkspaceClient({ presentationId }: { presentationId: string }) {
  useAutosave()

  const [generationError, setGenerationError] = useState<GenerationErrorState | null>(null)
  const [hydratedPresentationId, setHydratedPresentationId] = useState<string | null>(null)
  const setPresentation = usePresentationStore((state) => state.setPresentation)
  const setMoments = usePresentationStore((state) => state.setMoments)
  const setActiveMoment = usePresentationStore((state) => state.setActiveMoment)
  const hasDirtyMoments = usePresentationStore((state) => state.dirtyMomentIds.size > 0)
  const localMomentCount = usePresentationStore((state) => state.moments.length)

  const presentationQuery = trpc.presentation.getById.useQuery({ id: presentationId })
  const generationMutation = trpc.generation.create.useMutation({
    onSuccess: async () => {
      setGenerationError(null)
      await presentationQuery.refetch()
    },
    onError: async (error) => {
      setGenerationError({
        message: getGenerationErrorMessage(error),
        partialResult: getGenerationPartialResult(error),
      })
      await presentationQuery.refetch()
    },
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
    setGenerationError(null)
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

  if (hydratedPresentationId !== normalizedWorkspace.presentation.id) {
    return <LoadingState />
  }

  if (generationError) {
    const hasPartialMoments = Boolean(
      generationError.partialResult?.createdCount && normalizedWorkspace.moments.length > 0
    )
    const errorContent = (
      <GenerationError
        message={generationError.message}
        onRetry={handleGenerate}
        isRetrying={generationMutation.isPending}
        partialResult={generationError.partialResult}
        mode={hasPartialMoments ? 'banner' : 'page'}
      />
    )

    if (hasPartialMoments) {
      return <WorkspaceShell presentationId={presentationId} generationError={errorContent} />
    }

    return errorContent
  }

  const shouldShowGenerate = normalizedWorkspace.moments.length === 0

  if (shouldShowGenerate) {
    return (
      <DraftWorkspace
        presentationId={presentationId}
        onGenerate={handleGenerate}
        isGenerating={generationMutation.isPending}
      />
    )
  }

  return <WorkspaceShell presentationId={presentationId} />
}