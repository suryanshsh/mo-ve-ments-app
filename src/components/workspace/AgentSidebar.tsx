'use client'

import { useEffect, useRef, useState } from 'react'
import { showToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { useAgentStore } from '@/stores/agent'
import { usePresentationStore } from '@/stores/presentation'

type AgentSidebarProps = {
  presentationId: string
}

type SlideUpdateValue = {
  slide_heading?: unknown
  slide_bullets?: unknown
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function AgentSidebar({ presentationId }: AgentSidebarProps) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messages = useAgentStore((state) => state.messages)
  const isThinking = useAgentStore((state) => state.isThinking)
  const addMessage = useAgentStore((state) => state.addMessage)
  const setThinking = useAgentStore((state) => state.setThinking)
  const loadHistory = useAgentStore((state) => state.loadHistory)
  const activeMomentIndex = usePresentationStore((state) => state.activeMomentIndex)
  const updateMoment = usePresentationStore((state) => state.updateMoment)
  const historyQuery = trpc.agent.getHistory.useQuery({ presentationId })
  const chatMutation = trpc.agent.chat.useMutation({
    onSuccess: (data) => {
      if (data.text.trim()) {
        addMessage({ role: 'agent', text: data.text })
      }

      for (const updatedMoment of data.updatedMoments) {
        if (updatedMoment.field === 'script' && typeof updatedMoment.value === 'string') {
          updateMoment(updatedMoment.id, { script: updatedMoment.value })
        }

        if (updatedMoment.field === 'slide' && typeof updatedMoment.value === 'object' && updatedMoment.value !== null) {
          const value = updatedMoment.value as SlideUpdateValue
          const slideHeading = typeof value.slide_heading === 'string' ? value.slide_heading : undefined
          const slideBullets = Array.isArray(value.slide_bullets)
            ? value.slide_bullets.filter((bullet): bullet is string => typeof bullet === 'string')
            : undefined

          updateMoment(updatedMoment.id, {
            ...(slideHeading ? { slide_heading: slideHeading } : {}),
            ...(slideBullets ? { slide_bullets: slideBullets } : {}),
          })
        }
      }

      setThinking(false)
    },
    onError: () => {
      setThinking(false)
      showToast('The agent could not respond just now. Please try again.', 'error')
    },
  })

  useEffect(() => {
    if (historyQuery.data) {
      loadHistory(historyQuery.data)
    }
  }, [historyQuery.data, loadHistory])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isThinking])

  const handleSend = () => {
    const message = draft.trim()
    if (!message || chatMutation.isPending) return

    addMessage({ role: 'user', text: message })
    setDraft('')
    setThinking(true)
    chatMutation.mutate({
      presentationId,
      message,
      activeMomentIndex,
    })
  }

  return (
    <aside className="flex h-[520px] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:fixed lg:right-0 lg:top-[109px] lg:h-[calc(100vh-109px)] lg:w-[260px] lg:rounded-none lg:border-y-0 lg:border-r-0">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1D9E75] shadow-[0_0_0_4px_rgba(29,158,117,0.12)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-textLight">Agent</span>
          </div>
          <h2 className="mt-1 font-serif text-xl leading-6 text-text">Co-director</h2>
        </div>
        <span className="shrink-0 rounded-full bg-bgAlt px-2.5 py-1 text-[11px] font-medium text-textMid">
          {activeMomentIndex === null ? 'No moment' : `Moment ${activeMomentIndex + 1}`}
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isThinking && (
          <div className="rounded-xl bg-bgAlt px-3 py-3 text-sm leading-6 text-textMid">
            Select a moment, then ask for a sharper hook, a simpler slide, or a stronger speaker script.
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user'

          return (
            <div key={`${message.timestamp.getTime()}-${message.role}-${message.text}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                  isUser
                    ? 'rounded-br-md bg-accent text-white'
                    : 'rounded-bl-md bg-bgAlt text-text'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <p className={`mt-1 text-[10px] ${isUser ? 'text-white/70' : 'text-textLight'}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          )
        })}

        {isThinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-bgAlt px-3 py-2 text-sm text-textMid">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-surface p-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask for a revision..."
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-textLight"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || chatMutation.isPending}
            aria-label="Send message"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            ↑
          </button>
        </div>
      </div>
    </aside>
  )
}