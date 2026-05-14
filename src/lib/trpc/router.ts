import { router } from './server'
import { authRouter } from '@/modules/auth/router'
import { presentationRouter } from '@/modules/presentation/router'
import { documentRouter } from '@/modules/document/router'
import { generationRouter } from '@/modules/generation/router'
import { momentRouter } from '@/modules/moment/router'
import { agentRouter } from '@/modules/agent/router'
import { exportRouter } from '@/modules/export/router'

export const appRouter = router({
  auth: authRouter,
  presentation: presentationRouter,
  document: documentRouter,
  generation: generationRouter,
  moment: momentRouter,
  agent: agentRouter,
  export: exportRouter,
})

export type AppRouter = typeof appRouter
