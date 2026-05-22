'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? null)
    })
  }, [router])

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/dashboard" className="font-serif text-xl tracking-tight">
            <span className="text-brand">Mo</span>
            <span className="text-brand/50">(ve)</span>
            <span className="text-brand">ments</span>
          </a>

          <div className="flex items-center gap-4">
            {email && (
              <span className="text-sm text-textMid hidden sm:inline">{email}</span>
            )}
            <a href="/settings" className="text-sm text-textMid transition-colors hover:text-text">
              Settings
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-textMid hover:text-text transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}
