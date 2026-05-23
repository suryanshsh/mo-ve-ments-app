import { TRPCError } from '@trpc/server'
import type { createServerSupabaseClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const GENERATION_LIMITS = {
  free: 3,
  pro: 50,
  team: 50,
} as const

const PRESENTATION_LIMITS = {
  free: 2,
  pro: 999,
  team: 999,
} as const

type ProfilePlan = keyof typeof GENERATION_LIMITS
type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>
type UserIdentity = string | { id: string }

type ProfileRecord = {
  plan: ProfilePlan
  generation_count_today: number
  generation_count_reset_at: string | null
}

const getUserId = (user: UserIdentity) => typeof user === 'string' ? user : user.id

const isMissingProfileError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'PGRST116'

const getTodayUtcMidnight = () => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

const getNextUtcMidnight = () => {
  const today = getTodayUtcMidnight()
  return new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

const ensureOwnProfile = async (userId: string, supabase: SupabaseClient) => {
  const { data: profile, error } = await supabase.rpc('ensure_own_profile')

  if (error || !profile || profile.id !== userId) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not create account profile',
    })
  }

  return profile as ProfileRecord
}

const loadProfile = async (user: UserIdentity, supabase: SupabaseClient) => {
  const userId = getUserId(user)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, generation_count_today, generation_count_reset_at')
    .eq('id', userId)
    .single()

  if (isMissingProfileError(error)) {
    return ensureOwnProfile(userId, supabase)
  }

  if (error || !profile) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not load profile limits',
    })
  }

  return profile as ProfileRecord
}

const resetDailyCountIfNeeded = async (userId: string, profile: ProfileRecord, supabase: SupabaseClient) => {
  const todayMidnight = getTodayUtcMidnight()
  const resetAt = profile.generation_count_reset_at ? new Date(profile.generation_count_reset_at) : null
  const shouldReset = !resetAt || resetAt.getTime() <= todayMidnight.getTime()

  if (!shouldReset) {
    return profile
  }

  const nextResetAt = getNextUtcMidnight()
  const adminSupabase = createSupabaseAdminClient()
  const { data: updatedProfile, error } = await adminSupabase
    .from('profiles')
    .update({
      generation_count_today: 0,
      generation_count_reset_at: nextResetAt,
    })
    .eq('id', userId)
    .select('plan, generation_count_today, generation_count_reset_at')
    .single()

  if (error || !updatedProfile) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not reset daily generation limits',
    })
  }

  return updatedProfile as ProfileRecord
}

export async function checkGenerationLimit(user: UserIdentity, supabase: SupabaseClient) {
  const userId = getUserId(user)
  const profile = await loadProfile(user, supabase)
  const normalizedProfile = await resetDailyCountIfNeeded(userId, profile, supabase)
  const limit = GENERATION_LIMITS[normalizedProfile.plan] ?? GENERATION_LIMITS.free
  const used = Math.max(0, normalizedProfile.generation_count_today)
  const remaining = Math.max(0, limit - used)

  return {
    allowed: used < limit,
    remaining,
    limit,
  }
}

export async function checkPresentationLimit(user: UserIdentity, supabase: SupabaseClient) {
  const userId = getUserId(user)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  const normalizedProfile = isMissingProfileError(profileError)
    ? await ensureOwnProfile(userId, supabase)
    : profile

  if (profileError && !isMissingProfileError(profileError) || !normalizedProfile) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not load presentation limits',
    })
  }

  const { count, error: countError } = await supabase
    .from('presentations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not check presentation limits',
    })
  }

  const plan = (normalizedProfile.plan ?? 'free') as ProfilePlan
  const limit = PRESENTATION_LIMITS[plan] ?? PRESENTATION_LIMITS.free
  const used = count ?? 0
  const remaining = Math.max(0, limit - used)

  return {
    allowed: used < limit,
    remaining,
    limit,
  }
}

export async function incrementGenerationCount(userId: string, supabase: SupabaseClient): Promise<void> {
  const profile = await loadProfile(userId, supabase)
  const normalizedProfile = await resetDailyCountIfNeeded(userId, profile, supabase)

  const adminSupabase = createSupabaseAdminClient()
  const { error } = await adminSupabase
    .from('profiles')
    .update({
      generation_count_today: Math.max(0, normalizedProfile.generation_count_today) + 1,
      generation_count_reset_at: normalizedProfile.generation_count_reset_at ?? getNextUtcMidnight(),
    })
    .eq('id', userId)

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not increment generation count',
    })
  }
}