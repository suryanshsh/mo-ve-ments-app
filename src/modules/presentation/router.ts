import { publicProcedure, router } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const presentationRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const { data: { user } } = await ctx.supabase.auth.getUser()
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const { data: presentations, error } = await ctx.supabase
      .from('presentations')
      .select('*, moments(id)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    return (presentations ?? []).map((p) => ({
      ...p,
      moment_count: Array.isArray(p.moments) ? p.moments.length : 0,
      moments: undefined,
    }))
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: { user } } = await ctx.supabase.auth.getUser()
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const { data: presentation, error } = await ctx.supabase
        .from('presentations')
        .select('*, moments(*)')
        .eq('id', input.id)
        .eq('user_id', user.id)
        .single()

      if (error || !presentation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Presentation not found' })
      }

      return {
        ...presentation,
        moments: Array.isArray(presentation.moments)
          ? presentation.moments.sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          : [],
      }
    }),

  create: publicProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      audience: z.string().min(1),
      target_duration: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: { user } } = await ctx.supabase.auth.getUser()
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const { data: presentation, error } = await ctx.supabase
        .from('presentations')
        .insert({
          user_id: user.id,
          title: input.title,
          audience: input.audience,
          target_duration: input.target_duration,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return presentation
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: { user } } = await ctx.supabase.auth.getUser()
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const { error } = await ctx.supabase
        .from('presentations')
        .delete()
        .eq('id', input.id)
        .eq('user_id', user.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { success: true }
    }),
})
