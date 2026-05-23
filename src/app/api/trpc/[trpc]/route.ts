import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/lib/trpc/router'
import { createTRPCContext } from '@/lib/trpc/server'

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

const handler = async (req: Request) => {
  if (!isTrustedOrigin(req)) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: createTRPCContext,
    })
  } catch (error) {
    console.error('[trpc] Request handler failed:', error)

    return Response.json(
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
  }
}

export { handler as GET, handler as POST }
