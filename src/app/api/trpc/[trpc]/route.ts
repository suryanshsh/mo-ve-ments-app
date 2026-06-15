import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

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

const createInternalErrorResponse = (req: Request) => Response.json(
  [
    {
      error: {
        message: 'Internal server error',
        code: -32603,
        data: {
          code: 'INTERNAL_SERVER_ERROR',
          httpStatus: 500,
          path: getProcedurePath(req),
        },
      },
    },
  ],
  { status: 500 }
)

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
    const [{ appRouter }, { createTRPCContext }] = await Promise.all([
      import('@/lib/trpc/router'),
      import('@/lib/trpc/server'),
    ])

    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: createTRPCContext,
    })
  } catch (error) {
    console.error('[trpc] Request handler failed:', error)

    return createInternalErrorResponse(req)
  }
}

export { handler as GET, handler as POST }
