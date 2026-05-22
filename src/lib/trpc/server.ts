import { initTRPC } from '@trpc/server'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { createServerSupabaseClient } from '../supabase/server'
import { sanitizeStructuredInput } from '@/middleware/security'
import {
  getPartialResultFromError,
  getSafeClientMessage,
  toClientTRPCError,
} from '@/middleware/error-handler'

/**
 * This is the actual context you will use in your router.
 * It will be used to process every request that goes through your tRPC endpoint.
 */
export const createTRPCContext = async (opts?: FetchCreateContextFnOptions) => {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return {
    supabase,
    user: user
      ? {
          id: user.id,
          email: user.email,
        }
      : null,
    requestPath: opts?.req ? new URL(opts.req.url).pathname : undefined,
  }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: getSafeClientMessage(error),
      data: {
        ...shape.data,
        partialResult: getPartialResultFromError(error),
      },
    }
  },
})

const errorHandler = t.middleware(async ({ ctx, path, type, next }) => {
  const result = await next()

  if (!result.ok) {
    throw toClientTRPCError(result.error, {
      path,
      type,
      requestPath: ctx.requestPath,
      user: ctx.user,
    })
  }

  return result
})

const sanitizeMutationInputs = t.middleware(({ type, input, next }) => {
  if (type !== 'mutation') {
    return next()
  }

  return next({ input: sanitizeStructuredInput(input) })
})

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
export const publicProcedure = t.procedure.use(errorHandler).use(sanitizeMutationInputs)
