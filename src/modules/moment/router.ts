import { publicProcedure, router } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const VALID_EMOTIONS = ['hook', 'empathy', 'build', 'reveal', 'proof', 'close'] as const

const sourceCitationSchema = z.union([z.string(), z.record(z.string(), z.unknown())])

const momentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  emotion: z.enum(VALID_EMOTIONS).optional(),
  duration_seconds: z.number().int().positive().optional(),
  slide_heading: z.string().trim().nullable().optional(),
  slide_bullets: z.array(z.string().trim()).optional(),
  script: z.string().optional(),
  sources: z.array(sourceCitationSchema).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
})

const requireUser = async (supabase: unknown) => {
  const client = supabase as {
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> }
  }
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return user
}

export const momentRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'moment',
  })),

  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: momentUpdateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      await requireUser(ctx.supabase)

      const { data: updatedMoment, error } = await ctx.supabase
        .from('moments')
        .update({
          ...input.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error || !updatedMoment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Moment not found or not editable',
        })
      }

      return updatedMoment
    }),

  batchUpdate: publicProcedure
    .input(z.object({
      updates: z.array(z.object({
        id: z.string().uuid(),
        position: z.number().int().positive(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireUser(ctx.supabase)

      const { data: updatedMoments, error } = await ctx.supabase.rpc(
        'batch_update_moment_positions',
        { p_updates: input.updates }
      )

      if (error || !updatedMoments) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Could not reorder moments',
        })
      }

      return updatedMoments
    }),
})
