import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'

export const exportRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'export',
  })),
})
