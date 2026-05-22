type VerificationBadgeProps = {
  claim: string
  compact?: boolean
}

const TOOLTIP_TEXT = 'This claim could not be verified against your source documents'

export default function VerificationBadge({ claim, compact = false }: VerificationBadgeProps) {
  if (!claim.trim()) return null

  return (
    <span className="group relative inline-flex max-w-full">
      <span
        tabIndex={0}
        title={TOOLTIP_TEXT}
        className={`inline-flex max-w-full items-center gap-1 rounded-full border border-red-200 bg-red-50 font-medium leading-none text-red-700 outline-none transition-colors focus-visible:border-red-300 focus-visible:ring-2 focus-visible:ring-red-100 ${
          compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'
        }`}
      >
        <span aria-hidden="true">⚠</span>
        <span className="truncate">Uncited: {claim}</span>
      </span>
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-56 rounded-md border border-border bg-surface px-3 py-2 text-xs leading-5 text-textMid shadow-lg group-hover:block group-focus-within:block">
        {TOOLTIP_TEXT}
      </span>
    </span>
  )
}