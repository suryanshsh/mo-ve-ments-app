'use client'

import * as Sentry from '@sentry/nextjs'
import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('surface', 'workspace')
      scope.setContext('react', {
        componentStack: errorInfo.componentStack,
      })
      Sentry.captureException(error)
    })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <h1 className="mb-2 font-serif text-2xl text-text">Something went wrong</h1>
          <p className="mb-5 text-sm leading-6 text-textMid">
            The workspace hit an unexpected error. Reloading usually gets you back to the latest saved state.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[10px] bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Reload
          </button>
        </div>
      </main>
    )
  }
}