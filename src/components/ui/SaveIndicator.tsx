'use client'

import { useEffect, useState } from 'react'
import { usePresentationStore } from '@/stores/presentation'

const formatRelativeTime = (date: Date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))

  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds} seconds ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'} ago`
}

export default function SaveIndicator() {
  const isSaving = usePresentationStore((state) => state.isSaving)
  const lastSavedAt = usePresentationStore((state) => state.lastSavedAt)
  const saveError = usePresentationStore((state) => state.saveError)
  const [, setNow] = useState(Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(intervalId)
  }, [])

  if (saveError) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-red-600 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Save failed — retrying
      </span>
    )
  }

  if (isSaving) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-amber-700 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Saving...
      </span>
    )
  }

  return (
    <span className="hidden items-center gap-1.5 text-xs text-textLight sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-[#2A8C5E]" />
      {lastSavedAt ? `Saved ${formatRelativeTime(lastSavedAt)}` : 'All changes saved'}
    </span>
  )
}