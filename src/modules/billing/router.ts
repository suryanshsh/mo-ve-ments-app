import { createCheckout, getSubscription } from '@lemonsqueezy/lemonsqueezy.js'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { publicProcedure, router } from '@/lib/trpc/server'
import type { ProfilePlan } from '@/lib/supabase/types'
import { setupLemonSqueezy } from '@/lib/lemonsqueezy/client'

const checkoutInput = z.object({
  plan: z.enum(['pro', 'team']),
})

const BILLING_NOT_CONFIGURED_MESSAGE =
  'Billing is not configured yet. Add the Lemon Squeezy environment variables and restart the server.'

const requireEnv = (key: string) => {
  const value = process.env[key]

  if (!value) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: BILLING_NOT_CONFIGURED_MESSAGE,
    })
  }

  return value
}

const getVariantIdForPlan = (plan: 'pro' | 'team') => {
  if (plan === 'pro') return requireEnv('LEMON_SQUEEZY_PRO_VARIANT_ID')
  return requireEnv('LEMON_SQUEEZY_TEAM_VARIANT_ID')
}

const requireLemonSqueezy = () => {
  setupLemonSqueezy(requireEnv('LEMON_SQUEEZY_API_KEY'))
}

const requireUser = (user: { id: string; email?: string } | null) => {
  if (!user?.id || !user.email) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return user
}

export const billingRouter = router({
  createCheckout: publicProcedure
    .input(checkoutInput)
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx.user)
      requireLemonSqueezy()
      const storeId = requireEnv('LEMON_SQUEEZY_STORE_ID')
      const variantId = getVariantIdForPlan(input.plan)
      const appUrl = requireEnv('NEXT_PUBLIC_APP_URL').replace(/\/$/, '')

      const checkout = await createCheckout(storeId, variantId, {
        checkoutData: {
          email: user.email,
          custom: {
            user_id: user.id,
          },
        },
        productOptions: {
          redirectUrl: `${appUrl}/dashboard?upgraded=true`,
        },
      })

      const checkoutUrl = checkout.data?.data.attributes.url

      if (checkout.error || !checkoutUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create checkout. Check your Lemon Squeezy store and variant IDs.',
        })
      }

      return checkoutUrl
    }),

  getSubscription: publicProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx.user)
    const { data: profile, error } = await ctx.supabase
      .from('profiles')
      .select('plan, ls_subscription_id, ls_subscription_status')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not load subscription',
      })
    }

    return {
      plan: (profile.plan ?? 'free') as ProfilePlan,
      ls_subscription_id: profile.ls_subscription_id,
      ls_subscription_status: profile.ls_subscription_status,
    }
  }),

  getPortalUrl: publicProcedure.mutation(async ({ ctx }) => {
    const user = requireUser(ctx.user)
    const { data: profile, error } = await ctx.supabase
      .from('profiles')
      .select('ls_subscription_id')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not load subscription',
      })
    }

    if (!profile.ls_subscription_id) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription',
      })
    }

    requireLemonSqueezy()
    const subscription = await getSubscription(profile.ls_subscription_id)
    const portalUrl = subscription.data?.data.attributes.urls.customer_portal

    if (subscription.error || !portalUrl) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not load customer portal',
      })
    }

    return portalUrl
  }),
})