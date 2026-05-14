import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'

export const generationRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'generation',
  })),
})
