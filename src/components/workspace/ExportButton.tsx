'use client'

import { useEffect, useRef, useState } from 'react'
import { showToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { usePresentationStore } from '@/stores/presentation'

const triggerDownload = (downloadUrl: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const getFileName = (title: string) => {
  const safeTitle = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80)

  return `${safeTitle || 'presentation'}.pptx`
}

export default function ExportButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const presentation = usePresentationStore((state) => state.presentation)
  const mutation = trpc.export.createPptx.useMutation({
    onSuccess: ({ downloadUrl }) => {
      setIsOpen(false)
      setUpgradeMessage(null)
      triggerDownload(downloadUrl, getFileName(presentation?.title ?? 'presentation'))
      showToast('PowerPoint export ready.', 'success')
    },
    onError: (error) => {
      if (error.data?.code === 'FORBIDDEN') {
        setUpgradeMessage(error.message)
        setIsOpen(true)
        return
      }

      showToast('Export failed', 'error')
    },
  })

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const handleExport = () => {
    if (!presentation?.id || mutation.isPending) return

    setUpgradeMessage(null)
    mutation.mutate({ presentationId: presentation.id })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={!presentation?.id || mutation.isPending}
        className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
        )}
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-2 shadow-lg">
          <button
            type="button"
            onClick={handleExport}
            disabled={!presentation?.id || mutation.isPending}
            className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-textMid transition-colors hover:bg-bgAlt hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>Download as PowerPoint (.pptx)</span>
            {mutation.isPending && (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            )}
          </button>

          {upgradeMessage && (
            <div className="mt-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              {upgradeMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}