'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import UpgradePrompt from './UpgradePrompt'

const getToneClasses = (remaining: number) => {
  if (remaining <= 0) return 'border-red-200 bg-red-50 text-red-700'
  if (remaining === 1) return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

export default function LimitIndicator() {
  const [showPrompt, setShowPrompt] = useState(false)
  const generationLimitQuery = trpc.auth.generationLimit.useQuery(undefined, {
    staleTime: 30 * 1000,
    retry: false,
  })

  const status = useMemo(() => {
    const remaining = generationLimitQuery.data?.remaining ?? 0
    const limit = generationLimitQuery.data?.limit ?? 3

    return {
      remaining,
      limit,
      classes: getToneClasses(remaining),
    }
  }, [generationLimitQuery.data?.limit, generationLimitQuery.data?.remaining])

  if (generationLimitQuery.isLoading || generationLimitQuery.isError) {
    return null
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (status.remaining <= 0) {
            setShowPrompt((current) => !current)
          }
        }}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${status.classes}`}
        title={status.remaining <= 0 ? 'Limit reached. Click for upgrade options.' : undefined}
      >
        {status.remaining}/{status.limit} generations remaining
      </button>

      {showPrompt && status.remaining <= 0 && (
        <div className="absolute right-0 top-full z-40 mt-2">
          <UpgradePrompt
            description={`You have used all ${status.limit} daily generations on the free plan.`}
            onClose={() => setShowPrompt(false)}
          />
        </div>
      )}
    </div>
  )
}