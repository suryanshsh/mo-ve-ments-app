import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { AnyRouter } from '@trpc/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const getAllowedOrigins = (req: Request) => {
  const requestUrl = new URL(req.url)
  const configuredOrigins = [process.env.NEXT_PUBLIC_APP_URL, process.env.ALLOWED_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean)

  return new Set([requestUrl.origin, ...configuredOrigins])
}

const isTrustedOrigin = (req: Request) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true
  }

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  let candidate = origin

  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin
    } catch {
      return false
    }
  }

  if (!candidate) {
    return false
  }

  return getAllowedOrigins(req).has(candidate.replace(/\/$/, ''))
}

const getProcedurePath = (req: Request) => {
  const requestUrl = new URL(req.url)
  const routePrefix = '/api/trpc/'

  if (!requestUrl.pathname.startsWith(routePrefix)) {
    return undefined
  }

  return requestUrl.pathname.slice(routePrefix.length)
}

const getRequestedModuleNames = (procedurePath?: string) => {
  if (!procedurePath) {
    return []
  }

  return Array.from(
    new Set(
      decodeURIComponent(procedurePath)
        .split(',')
        .map((procedure) => procedure.split('.', 1)[0]?.trim())
        .filter((name): name is string => !!name)
    )
  )
}

const getServerErrorCode = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  if (/supabase/i.test(message) || /SUPABASE/.test(message)) {
    return 'supabase_setup_failed'
  }

  if (/module|import|resolve|Cannot find/i.test(message)) {
    return 'router_import_failed'
  }

  return 'trpc_handler_failed'
}

const createInternalErrorResponse = (req: Request, error: unknown, phase: string) => Response.json(
  [
    {
      error: {
        message: 'Internal server error',
        code: -32603,
        data: {
          code: 'INTERNAL_SERVER_ERROR',
          httpStatus: 500,
          path: getProcedurePath(req),
          serverErrorCode: getServerErrorCode(error),
          phase,
        },
      },
    },
  ],
  { status: 500 }
)

type RouterComposer = Awaited<typeof import('@/lib/trpc/server')>['router']

const routerLoaders = {
  auth: async () => (await import('@/modules/auth/router')).authRouter,
  presentation: async () => (await import('@/modules/presentation/router')).presentationRouter,
  document: async () => (await import('@/modules/document/router')).documentRouter,
  generation: async () => (await import('@/modules/generation/router')).generationRouter,
  moment: async () => (await import('@/modules/moment/router')).momentRouter,
  agent: async () => (await import('@/modules/agent/router')).agentRouter,
  export: async () => (await import('@/modules/export/router')).exportRouter,
  billing: async () => (await import('@/modules/billing/router')).billingRouter,
} satisfies Record<string, () => Promise<AnyRouter>>

const isKnownModuleName = (name: string): name is keyof typeof routerLoaders =>
  name in routerLoaders

const createScopedRouter = async (composeRouter: RouterComposer, procedurePath?: string) => {
  const routerEntries = await Promise.all(
    getRequestedModuleNames(procedurePath)
      .filter(isKnownModuleName)
      .map(async (name) => [name, await routerLoaders[name]()] as const)
  )

  return composeRouter(Object.fromEntries(routerEntries))
}

const handler = async (req: Request) => {
  if (!isTrustedOrigin(req)) {
    return Response.json(
      [
        {
          error: {
            message: 'Forbidden',
            code: -32603,
            data: {
              code: 'FORBIDDEN',
              httpStatus: 403,
              path: getProcedurePath(req),
            },
          },
        },
      ],
      { status: 403 }
    )
  }

  try {
    let createTRPCContext: Awaited<typeof import('@/lib/trpc/server')>['createTRPCContext']
    let router: RouterComposer

    try {
      ;({ createTRPCContext, router } = await import('@/lib/trpc/server'))
    } catch (error) {
      console.error('[trpc] Server import failed:', error)

      return createInternalErrorResponse(req, error, 'server_import')
    }

    let appRouter: AnyRouter

    try {
      appRouter = await createScopedRouter(router, getProcedurePath(req))
    } catch (error) {
      console.error('[trpc] Router import failed:', error)

      return createInternalErrorResponse(req, error, 'router_import')
    }

    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: createTRPCContext,
    })
  } catch (error) {
    console.error('[trpc] Request handler failed:', error)

    return createInternalErrorResponse(req, error, 'request_handler')
  }
}

export { handler as GET, handler as POST }
