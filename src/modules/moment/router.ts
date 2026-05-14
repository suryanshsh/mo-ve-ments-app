import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'

export const momentRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'moment',
  })),
})
