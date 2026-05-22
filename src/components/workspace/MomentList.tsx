'use client'

import { useEffect, useState } from 'react'
import { usePresentationStore } from '@/stores/presentation'
import MomentCard from './MomentCard'

export default function MomentList() {
  const moments = usePresentationStore((state) => state.moments)
  const activeMomentIndex = usePresentationStore((state) => state.activeMomentIndex)
  const setActiveMoment = usePresentationStore((state) => state.setActiveMoment)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsMounted(true))
    return () => window.cancelAnimationFrame(frameId)
  }, [moments.length])

  if (moments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-14 text-center shadow-sm">
        <h2 className="font-serif text-2xl text-text">No moments yet</h2>
        <p className="mt-2 text-sm text-textMid">Generate moments to build the storyboard.</p>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {moments.map((moment, index) => (
        <div
          key={moment.id}
          className={`transition-all duration-500 ease-out ${
            isMounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
            style={{ transitionDelay: isMounted ? `${index * 60}ms` : '0ms' }}
        >
          <MomentCard
            moment={moment}
            index={index}
            isActive={activeMomentIndex === index}
            isLast={index === moments.length - 1}
            onToggle={() => setActiveMoment(activeMomentIndex === index ? null : index)}
          />
        </div>
      ))}
    </div>
  )
}