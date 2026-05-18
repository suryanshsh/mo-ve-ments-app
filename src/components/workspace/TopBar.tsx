'use client'

import Link from 'next/link'
import LimitIndicator from '@/components/ui/LimitIndicator'
import SaveIndicator from '@/components/ui/SaveIndicator'
import { usePresentationStore } from '@/stores/presentation'
import ExportButton from './ExportButton'

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) return `${remainingSeconds}s`
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

export default function TopBar() {
  const { presentation, moments } = usePresentationStore()
  const totalSeconds = moments.reduce((sum, moment) => sum + moment.duration_seconds, 0)
  const totalDuration = presentation?.total_duration ?? formatDuration(totalSeconds)
  const title = presentation?.title ?? 'Untitled presentation'
  const audience = presentation?.audience ?? 'General audience'

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-5 px-5 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-border bg-bg text-lg leading-none text-textMid transition-colors hover:border-accent/30 hover:text-accent"
          >
            ←
          </Link>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate font-serif text-[18px] leading-6 text-text">{title}</h1>
              <SaveIndicator />
              <LimitIndicator />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-bgAlt px-2.5 py-1 text-[11px] font-medium text-textMid">
                {moments.length} moment{moments.length === 1 ? '' : 's'}
              </span>
              <span className="rounded-full bg-bgAlt px-2.5 py-1 text-[11px] font-medium text-textMid">
                {totalDuration}
              </span>
              <span className="max-w-[220px] truncate rounded-full bg-bgAlt px-2.5 py-1 text-[11px] font-medium text-textMid">
                {audience}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-[10px] border border-border bg-surface px-3.5 py-2 text-sm font-medium text-textMid transition-colors hover:border-accent/30 hover:text-text"
          >
            Sources
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="hidden rounded-[10px] border border-border bg-bgAlt px-3.5 py-2 text-sm font-medium text-textLight sm:inline-flex disabled:cursor-not-allowed"
          >
            Rehearse
          </button>
          <ExportButton />
        </div>
      </div>
    </header>
  )
}