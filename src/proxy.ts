import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit } from '@/middleware/rate-limiter'

const getClientIdentifier = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()

  return forwardedFor || realIp || 'unknown'
}

const getRateLimitTier = (path: string) => {
  if (
    path.includes('/api/trpc/generation.') ||
    path.includes('/api/trpc/agent.chat')
  ) {
    return 'generation' as const
  }

  return 'crud' as const
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (path.startsWith('/api/')) {
    const userId = user?.id ?? `anonymous:${getClientIdentifier(request)}`
    const tier = getRateLimitTier(path)
    const rateLimit = checkRateLimit(userId, tier)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter ?? 1) },
        }
      )
    }

    return response
  }

  if (!user && (path.startsWith('/dashboard') || path.startsWith('/workspace/') || path.startsWith('/settings'))) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (user && (path === '/login' || path === '/register')) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}