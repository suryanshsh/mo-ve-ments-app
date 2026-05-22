import {
  AGENT_SYSTEM_PROMPT_TEMPLATE,
  agentChat,
  parseAgentEdits,
  type AgentChatMessage,
} from '@/lib/ai'
import { collectTextStream } from '@/lib/ai/stream'
import { publicProcedure, router } from '@/lib/trpc/server'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

type ConversationMessage = {
  role: 'user' | 'agent'
  text: string
  timestamp: string
}

type MomentRecord = {
  id: string
  position: number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: unknown
  script: string
  sources: unknown
}

type PresentationRecord = {
  id: string
  title: string
  audience: string | null
  target_duration: string | null
  total_duration: string | null
  status: string
  moments: MomentRecord[]
}

type ConversationRecord = {
  id: string
  messages: unknown
}

type UpdatedMoment = {
  id: string
  field: 'script' | 'slide'
  value: unknown
}

const normalizeMessages = (messages: unknown): ConversationMessage[] => {
  if (!Array.isArray(messages)) return []

  return messages.flatMap((message) => {
    if (typeof message !== 'object' || message === null) return []

    const record = message as Record<string, unknown>
    const role = record.role === 'user' || record.role === 'agent' ? record.role : null
    const text = typeof record.text === 'string' ? record.text : ''
    const timestamp = typeof record.timestamp === 'string' ? record.timestamp : new Date().toISOString()

    return role && text ? [{ role, text, timestamp }] : []
  })
}

const toAnthropicMessages = (messages: ConversationMessage[]): AgentChatMessage[] =>
  messages.map((message) => ({
    role: message.role === 'agent' ? 'assistant' : 'user',
    content: message.text,
  }))

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

const toMomentPromptSummary = (moment: MomentRecord) => ({
  id: moment.position,
  database_id: moment.id,
  title: moment.title,
  emotion: moment.emotion,
  duration_seconds: moment.duration_seconds,
})

const toActiveMomentPrompt = (moment: MomentRecord | null) => {
  if (!moment) return null

  return {
    id: moment.position,
    database_id: moment.id,
    title: moment.title,
    emotion: moment.emotion,
    duration_seconds: moment.duration_seconds,
    slide_heading: moment.slide_heading,
    slide_bullets: normalizeStringArray(moment.slide_bullets),
    script: moment.script,
    sources: moment.sources,
  }
}

const collectAgentText = async (systemPrompt: string, messages: AgentChatMessage[]) => {
  return collectTextStream(agentChat(systemPrompt, messages))
}

const requireUser = async (supabase: unknown) => {
  const client = supabase as {
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> }
  }
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return user
}

const getOwnedPresentation = async (
  supabase: unknown,
  presentationId: string,
  userId: string
) => {
  const client = supabase as {
    from: (table: string) => any
  }
  const { data: presentation, error } = await client
    .from('presentations')
    .select('*, moments(*)')
    .eq('id', presentationId)
    .eq('user_id', userId)
    .single()

  if (error || !presentation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Presentation not found' })
  }

  return {
    ...(presentation as PresentationRecord),
    moments: Array.isArray(presentation.moments)
      ? [...presentation.moments].sort((first, second) => first.position - second.position)
      : [],
  }
}

const getOrCreateConversation = async (supabase: unknown, presentationId: string) => {
  const client = supabase as {
    from: (table: string) => any
  }
  const { data: existingConversation, error: selectError } = await client
    .from('agent_conversations')
    .select('id, messages')
    .eq('presentation_id', presentationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: selectError.message })
  }

  if (existingConversation) {
    return existingConversation as ConversationRecord
  }

  const { data: createdConversation, error: insertError } = await client
    .from('agent_conversations')
    .insert({ presentation_id: presentationId, messages: [] })
    .select('id, messages')
    .single()

  if (insertError || !createdConversation) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: insertError?.message ?? 'Could not create agent conversation',
    })
  }

  return createdConversation as ConversationRecord
}

const applyEdits = async (
  supabase: unknown,
  moments: MomentRecord[],
  edits: ReturnType<typeof parseAgentEdits>['edits']
) => {
  const client = supabase as {
    from: (table: string) => any
  }
  const updatedMoments: UpdatedMoment[] = []

  for (const edit of edits) {
    const moment = moments.find((candidate) => candidate.position === edit.momentId) ?? moments[edit.momentId - 1]

    if (!moment) continue

    if (edit.field === 'script') {
      const { error } = await client
        .from('moments')
        .update({ script: edit.value, updated_at: new Date().toISOString() })
        .eq('id', moment.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      updatedMoments.push({ id: moment.id, field: 'script', value: edit.value })
      continue
    }

    if (edit.field === 'slide' && typeof edit.value === 'object' && edit.value !== null) {
      const slide = edit.value as { slide_heading?: unknown; slide_bullets?: unknown }
      const slideHeading = typeof slide.slide_heading === 'string' ? slide.slide_heading : null
      const slideBullets = normalizeStringArray(slide.slide_bullets)

      if (!slideHeading) continue

      const value = {
        slide_heading: slideHeading,
        slide_bullets: slideBullets,
      }
      const { error } = await client
        .from('moments')
        .update({ ...value, updated_at: new Date().toISOString() })
        .eq('id', moment.id)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      updatedMoments.push({ id: moment.id, field: 'slide', value })
    }
  }

  return updatedMoments
}

export const agentRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    module: 'agent',
  })),

  getHistory: publicProcedure
    .input(z.object({ presentationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await requireUser(ctx.supabase)
      await getOwnedPresentation(ctx.supabase, input.presentationId, user.id)

      const { data: conversation, error } = await ctx.supabase
        .from('agent_conversations')
        .select('messages')
        .eq('presentation_id', input.presentationId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return normalizeMessages(conversation?.messages)
    }),

  chat: publicProcedure
    .input(z.object({
      presentationId: z.string().uuid(),
      message: z.string().trim().min(1).max(4000),
      activeMomentIndex: z.number().int().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await requireUser(ctx.supabase)
      const presentation = await getOwnedPresentation(ctx.supabase, input.presentationId, user.id)
      const conversation = await getOrCreateConversation(ctx.supabase, input.presentationId)
      const history = normalizeMessages(conversation.messages)
      const activeMoment = input.activeMomentIndex !== null
        ? presentation.moments[input.activeMomentIndex] ?? null
        : null
      const userMessage: ConversationMessage = {
        role: 'user',
        text: input.message,
        timestamp: new Date().toISOString(),
      }
      const systemPrompt = AGENT_SYSTEM_PROMPT_TEMPLATE({
        presentation: {
          id: presentation.id,
          title: presentation.title,
          audience: presentation.audience,
          target_duration: presentation.target_duration,
          total_duration: presentation.total_duration,
          status: presentation.status,
        },
        moments: presentation.moments.map(toMomentPromptSummary),
        activeMoment: toActiveMomentPrompt(activeMoment),
      })
      const messages = toAnthropicMessages([...history.slice(-20), userMessage])
      const response = await collectAgentText(systemPrompt, messages)
      const { cleanText, edits } = parseAgentEdits(response)
      const updatedMoments = await applyEdits(ctx.supabase, presentation.moments, edits)
      const agentText = cleanText || (updatedMoments.length > 0 ? 'I updated the selected moment.' : '')
      const nextMessages: ConversationMessage[] = [
        ...history,
        userMessage,
        {
          role: 'agent',
          text: agentText,
          timestamp: new Date().toISOString(),
        },
      ]

      const { error: updateConversationError } = await ctx.supabase
        .from('agent_conversations')
        .update({ messages: nextMessages, updated_at: new Date().toISOString() })
        .eq('id', conversation.id)

      if (updateConversationError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateConversationError.message })
      }

      return {
        text: agentText,
        updatedMoments,
      }
    }),
})
