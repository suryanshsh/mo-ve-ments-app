import { initTRPC } from '@trpc/server'
import { createServerSupabaseClient } from '../supabase/server'

/**
 * This is the actual context you will use in your router.
 * It will be used to process every request that goes through your tRPC endpoint.
 */
export const createTRPCContext = async () => {
  const supabase = await createServerSupabaseClient()

  return {
    supabase,
  }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create()

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
export const publicProcedure = t.procedure
