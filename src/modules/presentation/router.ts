import { publicProcedure, router } from '@/lib/trpc/server'
import { z } from 'zod'

export const presentationRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'presentation',
  })),
})
