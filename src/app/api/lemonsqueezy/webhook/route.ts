import crypto from 'crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ProfilePlan } from '@/lib/supabase/types'

export const runtime = 'nodejs'

type LemonWebhookBody = {
  meta?: {
    id?: unknown
    event_id?: unknown
    event_name?: unknown
    created_at?: unknown
    custom_data?: unknown
    custom?: unknown
  }
  data?: {
    id?: unknown
    attributes?: {
      customer_id?: unknown
      status?: unknown
      variant_id?: unknown
      store_id?: unknown
      updated_at?: unknown
      created_at?: unknown
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toStringValue = (value: unknown) => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

const getPlanFromVariantId = (variantId: unknown): Exclude<ProfilePlan, 'free'> | null => {
  const value = toStringValue(variantId)

  if (!value) return null
  if (value === process.env.LEMON_SQUEEZY_PRO_VARIANT_ID) return 'pro'
  if (value === process.env.LEMON_SQUEEZY_TEAM_VARIANT_ID) return 'team'
  return null
}

const getCustomUserId = (body: LemonWebhookBody) => {
  const customData = body.meta?.custom_data ?? body.meta?.custom

  if (!isRecord(customData)) return null
  return toStringValue(customData.user_id)
}

const getEventId = (body: LemonWebhookBody, rawBody: string) =>
  toStringValue(body.meta?.event_id) ??
  toStringValue(body.meta?.id) ??
  crypto.createHash('sha256').update(rawBody).digest('hex')

const normalizeTimestamp = (value: string | null) => {
  if (!value) return null

  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null

  return new Date(time).toISOString()
}

const getEventTimestamp = (body: LemonWebhookBody) =>
  normalizeTimestamp(
    toStringValue(body.data?.attributes?.updated_at) ??
    toStringValue(body.data?.attributes?.created_at) ??
    toStringValue(body.meta?.created_at)
  )

const isStaleEvent = (currentTimestamp: string | null, eventTimestamp: string | null) => {
  if (!currentTimestamp || !eventTimestamp) return false

  const currentTime = new Date(currentTimestamp).getTime()
  const eventTime = new Date(eventTimestamp).getTime()

  if (!Number.isFinite(currentTime) || !Number.isFinite(eventTime)) return false
  return eventTime < currentTime
}

const isExpectedStore = (body: LemonWebhookBody) => {
  const configuredStoreId = process.env.LEMON_SQUEEZY_STORE_ID
  const eventStoreId = toStringValue(body.data?.attributes?.store_id)

  return !configuredStoreId || !eventStoreId || configuredStoreId === eventStoreId
}

const verifySignature = (rawBody: string, signatureHeader: string | null) => {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET

  if (!secret) return false

  const hmac = crypto.createHmac('sha256', secret)
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8')
  const signature = Buffer.from(signatureHeader || '', 'utf8')

  if (digest.length !== signature.length) return false
  return crypto.timingSafeEqual(digest, signature)
}

const subscriptionUpdateForStatus = (status: string | null, variantId: unknown) => {
  if (status === 'cancelled' || status === 'expired' || status === 'past_due') {
    return { plan: 'free' as const }
  }

  if (status === 'active') {
    const plan = getPlanFromVariantId(variantId)
    return plan ? { plan } : {}
  }

  return {}
}

export async function POST(req: Request) {
  const rawBody = await req.text()

  if (!verifySignature(rawBody, req.headers.get('x-signature'))) {
    return new Response('Invalid signature', { status: 401 })
  }

  let body: LemonWebhookBody

  try {
    body = JSON.parse(rawBody) as LemonWebhookBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!isExpectedStore(body)) {
    return new Response('Store mismatch', { status: 400 })
  }

  const eventName = toStringValue(body.meta?.event_name)
  const subscriptionId = toStringValue(body.data?.id)
  const status = toStringValue(body.data?.attributes?.status)
  const variantId = body.data?.attributes?.variant_id
  const eventTimestamp = getEventTimestamp(body)
  const eventId = getEventId(body, rawBody)
  const supabase = createSupabaseAdminClient()
  const { error: eventInsertError } = await supabase
    .from('lemon_squeezy_webhook_events')
    .insert({
      event_id: eventId,
      event_name: eventName,
      subscription_id: subscriptionId,
      payload_created_at: eventTimestamp,
    })

  if (eventInsertError) {
    if (eventInsertError.code === '23505') {
      return new Response('OK', { status: 200 })
    }

    return new Response('Could not record webhook', { status: 500 })
  }

  const forgetEventForRetry = async () => {
    await supabase
      .from('lemon_squeezy_webhook_events')
      .delete()
      .eq('event_id', eventId)
      .then(() => undefined)
  }

  if (eventName === 'subscription_created') {
    const userId = getCustomUserId(body)
    const customerId = toStringValue(body.data?.attributes?.customer_id)
    const plan = getPlanFromVariantId(variantId)

    if (userId && customerId && subscriptionId && status && plan) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ls_customer_id: customerId,
          ls_subscription_id: subscriptionId,
          ls_subscription_status: status,
          ls_subscription_updated_at: eventTimestamp,
          plan,
        })
        .eq('id', userId)

      if (updateError) {
        await forgetEventForRetry()
        return new Response('Could not update subscription', { status: 500 })
      }
    }
  }

  if (eventName === 'subscription_updated' && subscriptionId && status) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('ls_subscription_updated_at')
      .eq('ls_subscription_id', subscriptionId)
      .maybeSingle()

    if (profileError) {
      await forgetEventForRetry()
      return new Response('Could not load subscription', { status: 500 })
    }

    if (isStaleEvent(profile?.ls_subscription_updated_at ?? null, eventTimestamp)) {
      return new Response('OK', { status: 200 })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ls_subscription_status: status,
        ls_subscription_updated_at: eventTimestamp,
        ...subscriptionUpdateForStatus(status, variantId),
      })
      .eq('ls_subscription_id', subscriptionId)

    if (updateError) {
      await forgetEventForRetry()
      return new Response('Could not update subscription', { status: 500 })
    }
  }

  return new Response('OK', { status: 200 })
}