import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  outputFileTracingIncludes: {
    '/api/trpc/*': [
      './node_modules/pdfjs-dist/package.json',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/cmaps/**/*',
      './node_modules/pdfjs-dist/iccs/**/*',
      './node_modules/pdfjs-dist/standard_fonts/**/*',
      './node_modules/pdfjs-dist/wasm/**/*',
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
