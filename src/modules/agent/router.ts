import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'

export const agentRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'agent',
  })),
})
