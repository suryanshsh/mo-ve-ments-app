import { generateMoments, GENERATION_SYSTEM_PROMPT } from '@/lib/ai'
import { publicProcedure, router } from '@/lib/trpc/server'
import type { createServerSupabaseClient } from '@/lib/supabase/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { checkGenerationLimit, incrementGenerationCount } from '@/modules/auth/plan-check'
import {
  verifyMomentSources,
  type Moment,
  type SourceCitation,
  type SourceDocument,
} from './source-verifier'

const VALID_EMOTIONS = ['hook', 'empathy', 'build', 'reveal', 'proof', 'close'] as const

const sourceCitationSchema = z.union([z.string(), z.record(z.string(), z.unknown())])

const generatedMomentSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  title: z.string().trim().min(1),
  emotion: z.enum(VALID_EMOTIONS),
  duration_seconds: z.coerce.number().int().positive(),
  slide_heading: z.string().trim().min(1),
  slide_bullets: z.array(z.string().trim().min(1)),
  script: z.string().trim().min(1),
  sources: z.array(sourceCitationSchema),
})

type GeneratedMoment = z.infer<typeof generatedMomentSchema>
type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>

type PresentationRecord = {
  id: string
  title: string
  audience: string | null
  target_duration: string | null
}

type SourceDocumentRecord = SourceDocument & {
  id: string
  presentation_id: string
  file_path: string
  file_size: number | null
  uploaded_at: string
}

type ExistingMomentRecord = {
  id: string
  presentation_id: string
  position: number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: unknown
  script: string
  sources: unknown
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

const normalizeChunks = (chunks: unknown): string[] => {
  if (!Array.isArray(chunks)) {
    return []
  }

  return chunks.flatMap((chunk) => {
    if (typeof chunk === 'string') {
      return chunk
    }

    if (typeof chunk === 'object' && chunk !== null) {
      const record = chunk as Record<string, unknown>
      const text = record.text ?? record.content ?? record.chunk

      if (typeof text === 'string') {
        return text
      }
    }

    return []
  })
}

const getSearchTerms = (value: string) =>
  Array.from(new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []))

const scoreChunk = (chunk: string, searchTerms: string[]) => {
  const normalizedChunk = chunk.toLowerCase()

  return searchTerms.reduce((score, term) => {
    const matches = normalizedChunk.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'))
    return score + (matches?.length ?? 0)
  }, 0)
}

const selectRelevantChunks = (
  sourceDocument: SourceDocumentRecord,
  searchText: string,
  maxChunks = 3
) => {
  const chunks = normalizeChunks(sourceDocument.chunks)
  const availableChunks = chunks.length > 0
    ? chunks
    : sourceDocument.extracted_text
      ? [sourceDocument.extracted_text]
      : []

  if (availableChunks.length <= maxChunks) {
    return availableChunks.map((text, index) => ({ text, index }))
  }

  const searchTerms = getSearchTerms(searchText)

  return availableChunks
    .map((text, index) => ({ text, index, score: scoreChunk(text, searchTerms) }))
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, maxChunks)
    .map(({ text, index }) => ({ text, index }))
}

const buildSourceContext = (
  sourceDocuments: SourceDocumentRecord[],
  searchText: string
) => {
  if (sourceDocuments.length === 0) {
    return 'No source documents were uploaded. Use the presentation context only and keep sources arrays empty.'
  }

  return sourceDocuments
    .map((sourceDocument) => {
      const selectedChunks = selectRelevantChunks(sourceDocument, searchText)

      if (selectedChunks.length === 0) {
        return `Source: ${sourceDocument.filename}\nNo extractable text was found for this source.`
      }

      const chunks = selectedChunks
        .map(({ text, index }) => `Chunk ${index + 1}:\n"""\n${text.trim()}\n"""`)
        .join('\n\n')

      return `Source: ${sourceDocument.filename}\n${chunks}`
    })
    .join('\n\n---\n\n')
}

const buildGenerationPrompt = (
  presentation: PresentationRecord,
  sourceDocuments: SourceDocumentRecord[]
) => {
  const searchText = [presentation.title, presentation.audience, presentation.target_duration]
    .filter(Boolean)
    .join(' ')

  return `${GENERATION_SYSTEM_PROMPT}

User context:
- Topic: ${presentation.title}
- Audience: ${presentation.audience ?? 'General audience'}
- Target duration: ${presentation.target_duration ?? '10 minutes'}

Source document context:
${buildSourceContext(sourceDocuments, searchText)}

JSON format instructions:
- Return JSON that can be parsed with JSON.parse without repair.
- Preferred shape for this service is { "moments": [...], "total_duration": "10 minutes", "tips": ["Brief presenter tip"] }.
- If returning a top-level array, return only the valid moment array.
- Each moment must include title, emotion, duration_seconds, slide_heading, slide_bullets, script, and sources.
- Sources must cite uploaded filenames exactly when factual claims depend on source material.`
}

const buildRegenerationPrompt = (
  presentation: PresentationRecord,
  moment: ExistingMomentRecord,
  sourceDocuments: SourceDocumentRecord[],
  instruction: string
) => {
  const searchText = [
    presentation.title,
    presentation.audience,
    moment.title,
    moment.script,
    instruction,
  ].join(' ')

  return `${GENERATION_SYSTEM_PROMPT}

Regenerate exactly one presentation moment. Return a single JSON object, or an array containing only that one object.

Presentation context:
- Topic: ${presentation.title}
- Audience: ${presentation.audience ?? 'General audience'}
- Target duration: ${presentation.target_duration ?? '10 minutes'}

Existing moment:
${JSON.stringify(moment, null, 2)}

User instruction:
${instruction}

Source document context:
${buildSourceContext(sourceDocuments, searchText)}

Keep the same narrative role unless the instruction clearly asks for a change. Preserve or improve source citations. Return only JSON.`
}

const collectStreamedText = async (prompt: string) => {
  const chunks: string[] = []

  for await (const chunk of generateMoments(prompt)) {
    chunks.push(chunk)
  }

  return chunks.join('')
}

const stripJsonMarkdown = (response: string) => {
  const trimmed = response.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)

  return (fenced?.[1] ?? trimmed).replace(/^`+|`+$/g, '').trim()
}

const parseJsonResponse = (response: string) => {
  const cleaned = stripJsonMarkdown(response)
  const candidates = [cleaned]
  const firstObject = cleaned.indexOf('{')
  const lastObject = cleaned.lastIndexOf('}')
  const firstArray = cleaned.indexOf('[')
  const lastArray = cleaned.lastIndexOf(']')

  if (firstObject !== -1 && lastObject > firstObject) {
    candidates.push(cleaned.slice(firstObject, lastObject + 1))
  }

  if (firstArray !== -1 && lastArray > firstArray) {
    candidates.push(cleaned.slice(firstArray, lastArray + 1))
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown
    } catch {
      continue
    }
  }

  throw new Error('Generation response was not valid JSON')
}

const getRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

const extractRawMoments = (parsed: unknown): unknown[] => {
  if (Array.isArray(parsed)) {
    return parsed
  }

  const record = getRecord(parsed)

  if (!record) {
    throw new Error('Generation response did not contain moments')
  }

  if (Array.isArray(record.moments)) {
    return record.moments
  }

  if (Array.isArray(record.presentation_moments)) {
    return record.presentation_moments
  }

  if (record.moment) {
    return [record.moment]
  }

  if (
    typeof record.title === 'string' &&
    typeof record.emotion === 'string' &&
    typeof record.script === 'string'
  ) {
    return [record]
  }

  throw new Error('Generation response did not contain moments')
}

const getParsedTips = (parsed: unknown): string[] => {
  const record = getRecord(parsed)

  if (!record) {
    return []
  }

  const tips = record.tips ?? record.presenter_tips ?? record.presentation_tips

  return toStringArray(tips)
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${remainingSeconds} seconds`
  }

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  return `${minutes} min ${remainingSeconds} sec`
}

const getParsedTotalDuration = (parsed: unknown, moments: GeneratedMoment[]) => {
  const record = getRecord(parsed)

  if (record) {
    const textDuration = record.total_duration ?? record.totalDuration

    if (typeof textDuration === 'string' && textDuration.trim()) {
      return textDuration.trim()
    }

    const numericDuration = record.total_duration_seconds ?? record.totalDurationSeconds

    if (typeof numericDuration === 'number' && Number.isFinite(numericDuration)) {
      return formatDuration(Math.max(1, Math.round(numericDuration)))
    }
  }

  const totalSeconds = moments.reduce((sum, moment) => sum + moment.duration_seconds, 0)
  return formatDuration(totalSeconds)
}

const parseGeneratedMoments = (response: string) => {
  const parsed = parseJsonResponse(response)
  const rawMoments = extractRawMoments(parsed)
  const result = z.array(generatedMomentSchema).min(1).safeParse(rawMoments)

  if (!result.success) {
    throw new Error('Generation response did not match the expected moment format')
  }

  return {
    moments: result.data,
    totalDuration: getParsedTotalDuration(parsed, result.data),
    tips: getParsedTips(parsed),
  }
}

const toMomentForVerification = (moment: GeneratedMoment): Moment => ({
  ...moment,
  sources: moment.sources as SourceCitation[],
})

const isVerificationMetadataSource = (source: unknown) =>
  typeof source === 'object' &&
  source !== null &&
  !Array.isArray(source) &&
  (source as Record<string, unknown>).type === 'verification'

const stripVerificationMetadataSources = (sources: unknown) =>
  Array.isArray(sources)
    ? sources.filter((source) => !isVerificationMetadataSource(source))
    : []

const toExistingMomentForPrompt = (moment: ExistingMomentRecord) => ({
  ...moment,
  slide_bullets: toStringArray(moment.slide_bullets),
  sources: stripVerificationMetadataSources(moment.sources),
})

const requireUser = async (supabase: SupabaseClient) => {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return user
}

const getOwnedPresentation = async (
  supabase: SupabaseClient,
  presentationId: string,
  userId: string
) => {
  const { data: presentation, error } = await supabase
    .from('presentations')
    .select('id, title, audience, target_duration')
    .eq('id', presentationId)
    .eq('user_id', userId)
    .single()

  if (error || !presentation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Presentation not found' })
  }

  return presentation as PresentationRecord
}

const getSourceDocuments = async (
  supabase: SupabaseClient,
  presentationId: string
) => {
  const { data: sourceDocuments, error } = await supabase
    .from('source_documents')
    .select('*')
    .eq('presentation_id', presentationId)
    .order('uploaded_at', { ascending: true })

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not load source documents' })
  }

  return (sourceDocuments ?? []) as SourceDocumentRecord[]
}

const throwFriendlyGenerationError = (error: unknown): never => {
  if (error instanceof TRPCError) {
    throw error
  }

  console.error('[generation] Generation pipeline failed:', error)
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Generation failed. Please try again.',
  })
}

export const generationRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'generation',
  })),

  create: publicProcedure
    .input(z.object({ presentationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await requireUser(ctx.supabase)
        const [presentation, sourceDocuments, generationLimit] = await Promise.all([
          getOwnedPresentation(ctx.supabase, input.presentationId, user.id),
          getSourceDocuments(ctx.supabase, input.presentationId),
          checkGenerationLimit(user.id, ctx.supabase),
        ])

        if (!generationLimit.allowed) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `You've used all ${generationLimit.limit} of your free daily generations. Upgrade to Pro for unlimited generations.`,
          })
        }

        const prompt = buildGenerationPrompt(presentation, sourceDocuments)
        const response = await collectStreamedText(prompt)
        const { moments, totalDuration, tips } = parseGeneratedMoments(response)
        const verifiedMoments = verifyMomentSources(
          moments.map(toMomentForVerification),
          sourceDocuments
        )

        const { error: deleteError } = await ctx.supabase
          .from('moments')
          .delete()
          .eq('presentation_id', input.presentationId)

        if (deleteError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not replace existing moments' })
        }

        const rows = verifiedMoments.map((moment, index) => ({
          presentation_id: input.presentationId,
          position: index + 1,
          title: moment.title,
          emotion: moment.emotion,
          duration_seconds: moment.duration_seconds,
          slide_heading: moment.slide_heading,
          slide_bullets: moment.slide_bullets,
          script: moment.script,
          sources: moment.sources,
        }))

        const { data: createdMoments, error: insertError } = await ctx.supabase
          .from('moments')
          .insert(rows)
          .select()

        if (insertError || !createdMoments) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not save generated moments' })
        }

        const sortedCreatedMoments = [...createdMoments].sort((first, second) => first.position - second.position)

        const { error: updatePresentationError } = await ctx.supabase
          .from('presentations')
          .update({
            status: 'generated',
            total_duration: totalDuration,
            tips,
          })
          .eq('id', input.presentationId)
          .eq('user_id', user.id)

        if (updatePresentationError) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not update presentation' })
        }

        await incrementGenerationCount(user.id, ctx.supabase)

        return sortedCreatedMoments.map((moment, index) => ({
          ...moment,
          _verification: verifiedMoments[index]?._verification,
        }))
      } catch (error) {
        throwFriendlyGenerationError(error)
      }
    }),

  regenerateOne: publicProcedure
    .input(z.object({
      momentId: z.string().uuid(),
      instruction: z.string().trim().min(1).max(3000),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await requireUser(ctx.supabase)
        const generationLimit = await checkGenerationLimit(user.id, ctx.supabase)

        if (!generationLimit.allowed) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `You've used all ${generationLimit.limit} of your free daily generations. Upgrade to Pro for unlimited generations.`,
          })
        }

        const { data: existingMoment, error: momentError } = await ctx.supabase
          .from('moments')
          .select('*')
          .eq('id', input.momentId)
          .single()

        if (momentError || !existingMoment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Moment not found' })
        }

        const moment = existingMoment as ExistingMomentRecord
        const presentation = await getOwnedPresentation(ctx.supabase, moment.presentation_id, user.id)
        const sourceDocuments = await getSourceDocuments(ctx.supabase, moment.presentation_id)
        const prompt = buildRegenerationPrompt(
          presentation,
          toExistingMomentForPrompt(moment),
          sourceDocuments,
          input.instruction
        )
        const response = await collectStreamedText(prompt)
        const { moments } = parseGeneratedMoments(response)
        const [generatedMoment] = verifyMomentSources(
          [toMomentForVerification(moments[0])],
          sourceDocuments
        )

        const { data: updatedMoment, error: updateError } = await ctx.supabase
          .from('moments')
          .update({
            title: generatedMoment.title,
            emotion: generatedMoment.emotion,
            duration_seconds: generatedMoment.duration_seconds,
            slide_heading: generatedMoment.slide_heading,
            slide_bullets: generatedMoment.slide_bullets,
            script: generatedMoment.script,
            sources: generatedMoment.sources,
          })
          .eq('id', input.momentId)
          .select()
          .single()

        if (updateError || !updatedMoment) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not update moment' })
        }

        await incrementGenerationCount(user.id, ctx.supabase)

        return {
          ...updatedMoment,
          _verification: generatedMoment._verification,
        }
      } catch (error) {
        throwFriendlyGenerationError(error)
      }
    }),
})
