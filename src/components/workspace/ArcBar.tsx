'use client'

import { usePresentationStore } from '@/stores/presentation'
import type { MomentEmotion } from '@/lib/supabase/types'

const EMOTION_COLORS: Record<MomentEmotion, string> = {
  hook: '#3A7BD5',
  empathy: '#D85A30',
  build: '#C68B1E',
  reveal: '#1D9E75',
  proof: '#2A8C5E',
  close: '#C4501B',
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) return `${remainingSeconds}s`
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

export default function ArcBar() {
  const { moments, presentation } = usePresentationStore()
  const totalSeconds = moments.reduce((sum, moment) => sum + moment.duration_seconds, 0)
  const totalDuration = presentation?.total_duration ?? formatDuration(totalSeconds)

  return (
    <section className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-4 lg:px-8">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border-light">
          {moments.length > 0 && (
            <div className="flex h-full w-full">
              {moments.map((moment) => (
                <div
                  key={moment.id}
                  className="h-full transition-[flex-grow] duration-500 ease-out"
                  style={{
                    flexGrow: Math.max(moment.duration_seconds, 1),
                    backgroundColor: EMOTION_COLORS[moment.emotion],
                  }}
                  title={`${moment.title} · ${formatDuration(moment.duration_seconds)}`}
                />
              ))}
            </div>
          )}
        </div>
        <span className="w-20 text-right text-xs font-medium text-textMid">{totalDuration}</span>
      </div>
    </section>
  )
}