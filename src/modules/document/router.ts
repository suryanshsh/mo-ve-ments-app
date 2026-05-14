import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'

export const documentRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'document',
  })),
})
