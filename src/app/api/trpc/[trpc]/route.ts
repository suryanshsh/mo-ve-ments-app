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

const handler = (req: Request) => {
  if (!isTrustedOrigin(req)) {
    return new Response('Forbidden', { status: 403 })
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  })
}

export { handler as GET, handler as POST }
