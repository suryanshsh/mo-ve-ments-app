'use client'

import { useEffect, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import type { MomentEmotion } from '@/lib/supabase/types'
import type { PresentationMoment } from '@/stores/presentation'
import SourceBadge from './SourceBadge'
import SlideEditor from './SlideEditor'
import ScriptEditor from './ScriptEditor'
import VerificationBadge from './VerificationBadge'

const EMOTION_META: Record<MomentEmotion, { label: string; icon: string; color: string; bg: string; purpose: string }> = {
  hook: { label: 'Hook', icon: '↗', color: '#3A7BD5', bg: '#EBF2FC', purpose: 'Opens attention and frames the stakes.' },
  empathy: { label: 'Empathy', icon: '♥', color: '#D85A30', bg: '#FAECE7', purpose: 'Builds trust by meeting the audience where they are.' },
  build: { label: 'Build', icon: '↑', color: '#C68B1E', bg: '#FDF5E6', purpose: 'Develops the core argument or journey.' },
  reveal: { label: 'Reveal', icon: '✦', color: '#1D9E75', bg: '#E1F5EE', purpose: 'Introduces the key insight or turning point.' },
  proof: { label: 'Proof', icon: '✓', color: '#2A8C5E', bg: '#E8F5EE', purpose: 'Supports the claim with evidence.' },
  close: { label: 'Close', icon: '●', color: '#82A5C2', bg: '#E2EDF5', purpose: 'Lands the takeaway and call to action.' },
}

type MomentCardProps = {
  moment: PresentationMoment
  index: number
  isActive: boolean
  isLast: boolean
  onToggle: () => void
  style?: CSSProperties
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) return `${remainingSeconds}s`
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

function EmotionBadge({ emotion }: { emotion: MomentEmotion }) {
  const meta = EMOTION_META[emotion]

  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        title={meta.purpose}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        <span className="text-[12px] leading-none">{meta.icon}</span>
        {meta.label}
      </span>
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-52 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium leading-5 text-textMid shadow-lg group-hover:block group-focus-within:block">
        {meta.purpose}
      </span>
    </span>
  )
}

function MiniSlide({ moment }: { moment: PresentationMoment }) {
  const bullets = moment.slide_bullets.slice(0, 2)

  return (
    <div className="aspect-video w-[110px] shrink-0 overflow-hidden rounded-md bg-[#1E293B] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <p className="line-clamp-2 text-[7px] font-semibold leading-[1.25] text-white">
        {moment.slide_heading || 'Untitled slide'}
      </p>
      {bullets.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {bullets.map((bullet, bulletIndex) => (
            <li key={`${moment.id}-preview-${bulletIndex}`} className="flex gap-1">
              <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-[#F59E0B]" />
              <span className="line-clamp-1 text-[6px] leading-[1.25] text-slate-300">{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SourceBadges({
  moment,
  compact = false,
  maxVisible,
}: {
  moment: PresentationMoment
  compact?: boolean
  maxVisible?: number
}) {
  if (moment.sources.length === 0) return null

  const visibleSources = typeof maxVisible === 'number'
    ? moment.sources.slice(0, maxVisible)
    : moment.sources
  const hiddenCount = moment.sources.length - visibleSources.length

  return (
    <>
      {visibleSources.map((source, sourceIndex) => (
        <SourceBadge key={`${moment.id}-source-${sourceIndex}`} source={source} compact={compact} />
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex items-center rounded-full border border-border bg-bgAlt px-2 py-1 text-[10px] font-medium leading-none text-textMid">
          +{hiddenCount}
        </span>
      )}
    </>
  )
}

function VerificationBadges({ moment, compact = false }: { moment: PresentationMoment; compact?: boolean }) {
  const claims = moment._verification?.uncitedClaims ?? []

  if (claims.length === 0) return null

  return (
    <>
      {claims.map((claim) => (
        <VerificationBadge key={`${moment.id}-claim-${claim}`} claim={claim} compact={compact} />
      ))}
    </>
  )
}

function TrustBadges({ moment }: { moment: PresentationMoment }) {
  const hasSources = moment.sources.length > 0
  const hasWarnings = (moment._verification?.uncitedClaims.length ?? 0) > 0

  if (!hasSources && !hasWarnings) return null

  return (
    <div className="flex flex-wrap gap-1.5 lg:justify-end">
      <SourceBadges moment={moment} />
      <VerificationBadges moment={moment} />
    </div>
  )
}

const isNestedInteractiveTarget = (target: EventTarget | null, currentTarget: HTMLElement) =>
  target instanceof HTMLElement &&
  target !== currentTarget &&
  Boolean(target.closest('button, a, input, textarea, select, [role="button"], [tabindex]'))

export default function MomentCard({ moment, index, isActive, isLast, onToggle, style }: MomentCardProps) {
  const [isScriptEditing, setIsScriptEditing] = useState(false)
  const [shouldRenderDetails, setShouldRenderDetails] = useState(isActive)
  const isUncited = moment._verification?.status === 'uncited'

  useEffect(() => {
    if (!isActive) setIsScriptEditing(false)
  }, [isActive])

  useEffect(() => {
    if (isActive) {
      setShouldRenderDetails(true)
      return
    }

    const timeoutId = window.setTimeout(() => setShouldRenderDetails(false), 300)
    return () => window.clearTimeout(timeoutId)
  }, [isActive])

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) return
    if (!isActive) onToggle()
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle()
    }
  }

  return (
    <article className="flex gap-4" style={style}>
      <div className="relative flex w-7 shrink-0 justify-center">
        <span className="relative mt-6 grid h-2.5 w-2.5 place-items-center">
          {isActive && <span className="absolute h-5 w-5 animate-ping rounded-full bg-accent/25" />}
          <span
            className={`relative h-2.5 w-2.5 rounded-full border-2 bg-bg transition-colors ${
              isActive ? 'border-accent' : 'border-textLight'
            }`}
          />
        </span>
        {!isLast && <span className="absolute bottom-[-28px] top-10 w-px bg-border" />}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-expanded={isActive}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        className={`min-w-0 flex-1 cursor-pointer rounded-xl border bg-surface p-5 shadow-sm transition-all duration-300 ${
          isActive
            ? 'border-accent/25 shadow-[0_18px_50px_rgba(58,71,90,0.08)]'
            : 'border-border hover:border-accent/25 hover:shadow-[0_14px_35px_rgba(58,71,90,0.06)]'
        } ${isUncited ? 'border-l-[3px] border-l-red-300' : ''}`}
      >
        <button
          type="button"
          aria-expanded={isActive}
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-textLight">
                Moment {index + 1}
              </span>
              <EmotionBadge emotion={moment.emotion} />
            </div>
            <h2 className="font-serif text-[18px] leading-6 text-text">{moment.title}</h2>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full bg-bgAlt px-2.5 py-1 text-xs font-semibold text-textMid">
              {formatDuration(moment.duration_seconds)}
            </span>
            {!isActive && (
              <div className="flex max-w-[280px] flex-wrap justify-end gap-1.5">
                <SourceBadges moment={moment} compact maxVisible={2} />
              </div>
            )}
          </div>
        </button>

        {moment._warning && (
          <div className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            {moment._warning}
          </div>
        )}

        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            {shouldRenderDetails && (
              <div className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <SlideEditor moment={moment} slideNumber={index + 1} />
                  <ScriptEditor moment={moment} isEditing={isScriptEditing} onEditingChange={setIsScriptEditing} />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-border-light pt-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsScriptEditing(true)}
                      className="rounded-[10px] border border-border bg-surface px-3.5 py-2 text-sm font-medium text-textMid transition-colors hover:border-accent/30 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isScriptEditing}
                    >
                      Edit script
                    </button>
                    <button
                      type="button"
                      className="rounded-[10px] border border-border bg-bgAlt px-3.5 py-2 text-sm font-medium text-textMid transition-colors hover:border-accent/30 hover:text-text"
                    >
                      Revise with agent
                    </button>
                  </div>
                  <TrustBadges moment={moment} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isActive ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
          <div className="overflow-hidden">
            <div className={`mt-4 grid gap-4 transition-opacity duration-300 md:grid-cols-[110px_minmax(0,1fr)] ${isActive ? 'opacity-0' : 'opacity-100'}`}>
              <MiniSlide moment={moment} />
              <div className="min-w-0 self-center">
                <p className="line-clamp-2 text-[13px] leading-5 text-textMid">{moment.script}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}