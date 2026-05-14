import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'

export const authRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'auth',
  })),
})
