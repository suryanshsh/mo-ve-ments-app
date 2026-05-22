'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import CreateModal from '@/components/presentation/CreateModal'
import Toast, { showToast } from '@/components/ui/Toast'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  generated: 'Generated',
  edited: 'Edited',
  exported: 'Exported',
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`dashboard-skeleton-${index}`} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="skeleton-shimmer mb-4 h-5 w-4/5 rounded-md" />
          <div className="mb-5 flex gap-2">
            <div className="skeleton-shimmer h-6 w-20 rounded-full" />
            <div className="skeleton-shimmer h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton-shimmer h-3 w-28 rounded-md" />
        </div>
      ))}
    </div>
  )
}

function EmptyDashboard({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
      <div className="mb-6 grid h-24 w-24 place-items-center rounded-2xl border border-border bg-bgAlt shadow-sm">
        <div className="h-14 w-16 rounded-lg border border-border bg-surface p-2 shadow-sm">
          <div className="mb-2 h-2 w-10 rounded-full bg-accent/25" />
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-border" />
            <div className="h-1.5 w-4/5 rounded-full bg-border" />
            <div className="h-1.5 w-2/3 rounded-full bg-border" />
          </div>
        </div>
      </div>
      <h2 className="font-serif text-3xl text-text">No presentations yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-textMid">
        Create a workspace when you are ready to turn a brief, notes, or research into presentation moments.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
      >
        Create your first presentation
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const { data: presentations, isLoading } = trpc.presentation.list.useQuery()
  const deleteMutation = trpc.presentation.delete.useMutation()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') !== 'true') return

    const timeoutId = window.setTimeout(() => {
      showToast('Upgrade successful. Your plan will update once Lemon Squeezy confirms it.', 'success')
    }, 0)

    params.delete('upgraded')
    const nextSearch = params.toString()
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
    window.history.replaceState({}, '', nextUrl)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => setDeleteId(null),
    })
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-text">Your presentations</h1>
          <p className="text-textMid text-sm mt-1">
            {presentations?.length
              ? `${presentations.length} presentation${presentations.length === 1 ? '' : 's'}`
              : 'Get started by creating your first presentation'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 rounded-[10px] bg-accent text-white font-medium text-sm hover:bg-accent/90 transition-colors"
        >
          + New presentation
        </button>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : !presentations?.length ? (
        <EmptyDashboard onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presentations.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/workspace/${p.id}`)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return

                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/workspace/${p.id}`)
                }
              }}
              className="group relative bg-surface rounded-xl border border-border p-5 cursor-pointer hover:border-accent/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-text text-[15px] line-clamp-2 pr-6">{p.title}</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenu(openMenu === p.id ? null : p.id)
                    }}
                    className="p-1 rounded-md text-textLight hover:text-textMid hover:bg-bgAlt transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-label={`Open actions for ${p.title}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>
                  {openMenu === p.id && (
                    <div className="absolute right-0 top-8 z-10 bg-surface border border-border rounded-lg shadow-lg py-1 w-36">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenu(null)
                          setDeleteId(p.id)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {p.audience && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-bgAlt text-textMid">
                    {p.audience}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-bgAlt text-textMid">
                  {p.moment_count} moment{p.moment_count === 1 ? '' : 's'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-bgAlt text-textMid">
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>

              <p className="text-xs text-textLight mt-3">
                Edited {timeAgo(p.updated_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null) }}
        >
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-serif text-xl text-text mb-2">Delete presentation?</h3>
            <p className="text-sm text-textMid mb-6">
              This will permanently delete the presentation, all its moments, and conversation history. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-[10px] border border-border text-textMid hover:bg-bgAlt transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-[10px] bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast />
    </main>
  )
}
