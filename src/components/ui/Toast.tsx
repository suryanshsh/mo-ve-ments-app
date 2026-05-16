'use client'

import { useEffect, useState } from 'react'

type ToastVariant = 'default' | 'error' | 'success'

type ToastMessage = {
  id: number
  message: string
  variant: ToastVariant
}

const listeners = new Set<(toast: ToastMessage) => void>()
let nextToastId = 1

export function showToast(message: string, variant: ToastVariant = 'default') {
  const toast = {
    id: nextToastId,
    message,
    variant,
  }
  nextToastId += 1

  listeners.forEach((listener) => listener(toast))
}

export default function Toast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => {
    const listener = (nextToast: ToastMessage) => setToast(nextToast)
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (!toast) return

    const timeoutId = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  if (!toast) return null

  const variantClass = toast.variant === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : toast.variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-border bg-surface text-text'

  return (
    <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 pointer-events-none">
      <div className={`max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg ${variantClass}`}>
        {toast.message}
      </div>
    </div>
  )
}