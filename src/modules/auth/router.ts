import { publicProcedure, router } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { checkGenerationLimit } from './plan-check'

export const authRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'auth',
  })),

  generationLimit: publicProcedure.query(async ({ ctx }) => {
    const { data: { user }, error } = await ctx.supabase.auth.getUser()

    if (error || !user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return checkGenerationLimit(user.id, ctx.supabase)
  }),
})
