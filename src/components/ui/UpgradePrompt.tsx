'use client'

import { showToast } from './Toast'

type UpgradePromptProps = {
  title?: string
  description: string
  onClose?: () => void
}

export default function UpgradePrompt({
  title = 'You have hit a free plan limit',
  description,
  onClose,
}: UpgradePromptProps) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-amber-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-amber-800">{description}</p>
          <p className="mt-3 text-xs leading-5 text-amber-900/90">
            Pro includes 50 AI generations/day, more presentations, and PPTX export.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-amber-300 bg-white text-sm text-amber-700 transition-colors hover:bg-amber-100"
            aria-label="Close upgrade prompt"
          >
            x
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => showToast('Upgrade checkout is coming soon.', 'default')}
        className="mt-4 inline-flex rounded-[10px] bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
      >
        Upgrade to Pro - $15/month
      </button>
    </div>
  )
}