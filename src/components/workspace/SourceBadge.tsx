import type { SourceCitation } from '@/stores/presentation'

type SourceBadgeProps = {
  source: SourceCitation
  compact?: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const sourceLabel = (source: SourceCitation) => {
  if (typeof source === 'string') return source

  const filename = typeof source.filename === 'string' ? source.filename : ''
  const citation = typeof source.citation === 'string' ? source.citation : ''
  const reference = typeof source.reference === 'string' ? source.reference : ''
  const label = typeof source.label === 'string' ? source.label : ''
  const page = typeof source.page === 'string' || typeof source.page === 'number' ? `p.${source.page}` : ''

  return [label, citation, filename, reference, page].find((value) => value.trim()) ?? ''
}

const isVerifiedSource = (source: SourceCitation) =>
  isRecord(source) && source.verified === true

export default function SourceBadge({ source, compact = false }: SourceBadgeProps) {
  const label = sourceLabel(source)

  if (!label) return null

  const verified = isVerifiedSource(source)

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border font-medium leading-none ${
        verified
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      } ${compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'}`}
      title={label}
    >
      <span aria-hidden="true">{verified ? '✓' : '📄'}</span>
      <span className="truncate">{label}</span>
    </span>
  )
}