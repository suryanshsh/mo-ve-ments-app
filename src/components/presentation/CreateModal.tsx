'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'

const AUDIENCES = [
  'Investors / VCs',
  'Executive leadership',
  'Technical team',
  'Clients / Customers',
  'General audience',
]

const DURATIONS = [
  '5 minutes',
  '10 minutes',
  '15 minutes',
  '20 minutes',
  '30 minutes',
]

export default function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [audience, setAudience] = useState(AUDIENCES[0])
  const [duration, setDuration] = useState(DURATIONS[1])

  const createMutation = trpc.presentation.create.useMutation({
    onSuccess: (data) => {
      router.push(`/workspace/${data.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createMutation.mutate({
      title: title.trim(),
      audience,
      target_duration: duration,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="font-serif text-2xl text-text">New presentation</h2>
          <p className="text-textMid text-sm mt-1">Set up your presentation basics. You can change these later.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-text mb-1.5">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Series A Pitch Deck"
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-bg text-text placeholder:text-textLight focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-text mb-1.5">
              Audience
            </label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors appearance-none"
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-text mb-1.5">
              Target duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors appearance-none"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-[10px] border border-border text-textMid hover:bg-bgAlt transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || createMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-[10px] bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating…' : 'Create presentation'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-red-600 text-center">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
