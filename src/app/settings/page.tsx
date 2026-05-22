'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import Toast, { showToast } from '@/components/ui/Toast'

type Plan = 'free' | 'pro' | 'team'

const planBadgeClasses: Record<Plan, string> = {
  free: 'border-border bg-bgAlt text-textMid',
  pro: 'border-accent/25 bg-accent-soft text-accent-text',
  team: 'border-teal-200 bg-teal-50 text-teal-700',
}

const statusBadgeClasses: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-amber-200 bg-amber-50 text-amber-800',
  past_due: 'border-red-200 bg-red-50 text-red-700',
  expired: 'border-red-200 bg-red-50 text-red-700',
}

const formatLabel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function SettingsPage() {
  const subscriptionQuery = trpc.billing.getSubscription.useQuery(undefined, {
    retry: false,
  })
  const checkoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (error) => showToast(error.message || 'Could not start checkout', 'error'),
  })
  const portalMutation = trpc.billing.getPortalUrl.useMutation({
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (error) => showToast(error.message || 'Could not open subscription portal', 'error'),
  })

  const plan = subscriptionQuery.data?.plan ?? 'free'
  const status = subscriptionQuery.data?.ls_subscription_status ?? 'inactive'
  const statusClasses = statusBadgeClasses[status] ?? 'border-border bg-bgAlt text-textMid'

  return (
    <main className="min-h-screen bg-bg px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-textMid transition-colors hover:text-text">
              ← Dashboard
            </Link>
            <h1 className="mt-4 font-serif text-4xl text-text">Settings</h1>
            <p className="mt-2 text-sm leading-6 text-textMid">
              Manage your Mo(ve)ments plan and subscription billing.
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textLight">Billing</p>
              <h2 className="mt-3 font-serif text-3xl text-text">Current plan</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-textMid">
                Lemon Squeezy securely handles checkout, taxes, invoices, cancellation, payment methods, and plan changes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${planBadgeClasses[plan]}`}>
                {formatLabel(plan)}
              </span>
              {plan !== 'free' && (
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses}`}>
                  {formatLabel(status)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-[10px] border border-border bg-bg p-5">
            {subscriptionQuery.isLoading ? (
              <div className="space-y-3">
                <div className="skeleton-shimmer h-5 w-40 rounded-md" />
                <div className="skeleton-shimmer h-4 w-5/6 rounded-md" />
                <div className="skeleton-shimmer h-10 w-44 rounded-[10px]" />
              </div>
            ) : plan === 'free' ? (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-serif text-2xl text-text">Upgrade when you need more room.</h3>
                  <p className="mt-2 text-sm leading-6 text-textMid">
                    Pro includes more presentations, more AI generation, and export access through Lemon Squeezy checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => checkoutMutation.mutate({ plan: 'pro' })}
                  disabled={checkoutMutation.isPending}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutMutation.isPending && (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                  )}
                  Upgrade to Pro — $15/month
                </button>
                {checkoutMutation.error && (
                  <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:max-w-xs">
                    {checkoutMutation.error.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-serif text-2xl text-text">Your subscription is managed by Lemon Squeezy.</h3>
                  <p className="mt-2 text-sm leading-6 text-textMid">
                    Open the hosted customer portal to change plans, cancel, update payment methods, or download invoices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {portalMutation.isPending && (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                  )}
                  Manage subscription
                </button>
                {portalMutation.error && (
                  <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:max-w-xs">
                    {portalMutation.error.message}
                  </p>
                )}
              </div>
            )}

            {subscriptionQuery.isError && (
              <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Could not load your billing details. Please try again.
              </p>
            )}
          </div>
        </section>
      </div>
      <Toast />
    </main>
  )
}
