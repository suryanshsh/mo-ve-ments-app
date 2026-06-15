'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useState } from 'react'
import type { AppRouter } from '@/modules'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
      },
    },
  })

let clientQueryClientSingleton: QueryClient | undefined
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always create a new query client
    return createQueryClient()
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient())
}

const isLocalhost = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const getTRPCErrorCode = (status: number) => {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 429) return 'TOO_MANY_REQUESTS'
  return 'INTERNAL_SERVER_ERROR'
}

const getUnexpectedResponseMessage = (status: number) => {
  if (status === 404) return 'The API endpoint was not found. Please try again after the latest deployment finishes.'
  if (status === 429) return 'Please slow down and try again in a moment.'
  if (status >= 500) return 'The server returned an unexpected error page. Please try again in a moment.'
  return 'The server returned an unexpected response. Please try again.'
}

const createUnexpectedTRPCResponse = (response: Response) => Response.json(
  [
    {
      error: {
        message: getUnexpectedResponseMessage(response.status),
        code: -32603,
        data: {
          code: getTRPCErrorCode(response.status),
          httpStatus: response.status,
        },
      },
    },
  ],
  { status: response.status }
)

export const trpc = createTRPCReact<AppRouter>({
  overrides: {
    useMutation: {
      async onSuccess(opts) {
        await opts.originalFn()
        await opts.queryClient.invalidateQueries()
      },
    },
  },
})

export function TRPCReactProvider(props: {
  children: React.ReactNode
}) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: isLocalhost,
        }),
        httpBatchLink({
          url: '/api/trpc',
          fetch: async (input, init?) => {
            const fetch_ = typeof window !== 'undefined' ? window.fetch : global.fetch
            const response = await fetch_(input, {
              ...init,
              credentials: 'include',
            })

            const contentType = response.headers.get('content-type') ?? ''

            if (!contentType.includes('application/json')) {
              await response.text().catch(() => '')
              return createUnexpectedTRPCResponse(response)
            }

            return response
          },
        }),
      ],
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </trpc.Provider>
    </QueryClientProvider>
  )
}
