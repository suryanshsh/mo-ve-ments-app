import { publicProcedure, router } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { generatePptx, type Moment, type Presentation } from './pptx-generator'

const EXPORTS_BUCKET = 'exports'
const SIGNED_URL_TTL_SECONDS = 60 * 60

type ProfileRecord = {
  plan: 'free' | 'pro' | 'team'
}

type PresentationRecord = Presentation & {
  id: string
  user_id: string
  moments: MomentRecord[]
}

type MomentRecord = {
  position: number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: unknown
  script: string
}

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

const normalizeMoment = (moment: MomentRecord): Moment => ({
  position: moment.position,
  title: moment.title,
  emotion: moment.emotion,
  duration_seconds: moment.duration_seconds,
  slide_heading: moment.slide_heading,
  slide_bullets: normalizeStringArray(moment.slide_bullets),
  script: moment.script,
})

const sanitizeFileName = (value: string) => {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')

  return normalized.slice(0, 80) || 'presentation'
}

const requireUser = async (supabase: unknown) => {
  const client = supabase as {
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> }
  }
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
  }

  return user
}

const getProfile = async (supabase: unknown, userId: string) => {
  const client = supabase as { from: (table: string) => any }
  const { data: profile, error } = await client
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not load account plan' })
  }

  return profile as ProfileRecord
}

const getPresentationWithMoments = async (
  supabase: unknown,
  presentationId: string,
  userId: string
) => {
  const client = supabase as { from: (table: string) => any }
  const { data: presentation, error } = await client
    .from('presentations')
    .select('id, user_id, title, audience, target_duration, total_duration, moments(*)')
    .eq('id', presentationId)
    .eq('user_id', userId)
    .single()

  if (error || !presentation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Presentation not found' })
  }

  const record = presentation as PresentationRecord

  return {
    ...record,
    moments: Array.isArray(record.moments)
      ? [...record.moments].sort((first, second) => first.position - second.position)
      : [],
  }
}

export const exportRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'export',
  })),

  createPptx: publicProcedure
    .input(z.object({ presentationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireUser(ctx.supabase)
      const [profile, presentation] = await Promise.all([
        getProfile(ctx.supabase, user.id),
        getPresentationWithMoments(ctx.supabase, input.presentationId, user.id),
      ])

      if (profile.plan === 'free') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'PPTX export is available on the Pro plan.',
        })
      }

      if (presentation.moments.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Generate moments before exporting.' })
      }

      const moments = presentation.moments.map(normalizeMoment)
      const pptxBuffer = await generatePptx(presentation, moments)
      const fileName = `${sanitizeFileName(presentation.title)}.pptx`
      const objectPath = `${user.id}/${presentation.id}/${fileName}`
      const filePath = `${EXPORTS_BUCKET}/${objectPath}`

      const { error: uploadError } = await ctx.supabase.storage
        .from(EXPORTS_BUCKET)
        .upload(objectPath, pptxBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          upsert: true,
        })

      if (uploadError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Export upload failed: ${uploadError.message}`,
        })
      }

      const { data: signedUrlData, error: signedUrlError } = await ctx.supabase.storage
        .from(EXPORTS_BUCKET)
        .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS, { download: fileName })

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: signedUrlError?.message ?? 'Could not create export download link',
        })
      }

      const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString()
      const { data: exportRecord, error: insertError } = await ctx.supabase
        .from('exports')
        .insert({
          presentation_id: presentation.id,
          format: 'pptx',
          file_path: filePath,
          signed_url: signedUrlData.signedUrl,
          expires_at: expiresAt,
        })
        .select('id')
        .single()

      if (insertError || !exportRecord) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: insertError?.message ?? 'Could not save export record',
        })
      }

      return {
        downloadUrl: signedUrlData.signedUrl,
        exportId: exportRecord.id as string,
      }
    }),
})
