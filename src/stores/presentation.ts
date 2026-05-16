import { create } from 'zustand'
import type { MomentEmotion, PresentationStatus } from '@/lib/supabase/types'

export type SourceCitation = string | Record<string, unknown>

export type PresentationSummary = {
  id: string
  title: string
  audience: string | null
  target_duration: string | null
  total_duration: string | null
  status: PresentationStatus | string
  tips?: string[] | null
  created_at?: string
  updated_at?: string
}

export type PresentationMoment = {
  id: string
  presentation_id: string
  position: number
  title: string
  emotion: MomentEmotion
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: string[]
  script: string
  sources: SourceCitation[]
  created_at?: string
  updated_at?: string
  _warning?: string
  _sourceVerification?: {
    verified: boolean
    verifiedSources: string[]
  }
}

type MomentUpdate = Partial<Omit<PresentationMoment, 'id'>>

interface PresentationState {
  presentation: PresentationSummary | null
  moments: PresentationMoment[]
  activeMomentIndex: number | null
  isSaving: boolean
  lastSavedAt: Date | null
  setPresentation: (presentation: PresentationSummary | null) => void
  setMoments: (moments: PresentationMoment[]) => void
  setActiveMoment: (index: number | null) => void
  updateMoment: (id: string, update: MomentUpdate) => void
  addMoment: (moment: PresentationMoment) => void
  deleteMoment: (id: string) => void
  reorderMoments: (orderedMoments: PresentationMoment[] | string[]) => void
  setSaving: (isSaving: boolean) => void
  markSaved: (savedAt?: Date) => void
}

const sortMoments = (moments: PresentationMoment[]) =>
  [...moments].sort((first, second) => first.position - second.position)

const reindexMoments = (moments: PresentationMoment[]) =>
  moments.map((moment, index) => ({ ...moment, position: index + 1 }))

export const usePresentationStore = create<PresentationState>((set) => ({
  presentation: null,
  moments: [],
  activeMomentIndex: null,
  isSaving: false,
  lastSavedAt: null,

  setPresentation: (presentation) =>
    set({
      presentation,
      isSaving: false,
      lastSavedAt: presentation ? new Date() : null,
    }),

  setMoments: (moments) =>
    set((state) => ({
      moments: sortMoments(moments),
      activeMomentIndex:
        state.activeMomentIndex !== null && state.activeMomentIndex < moments.length
          ? state.activeMomentIndex
          : null,
    })),

  setActiveMoment: (index) =>
    set((state) => ({
      activeMomentIndex:
        index !== null && index >= 0 && index < state.moments.length ? index : null,
    })),

  updateMoment: (id, update) =>
    set((state) => ({
      moments: state.moments.map((moment) =>
        moment.id === id ? { ...moment, ...update, id: moment.id } : moment
      ),
      isSaving: false,
      lastSavedAt: new Date(),
    })),

  addMoment: (moment) =>
    set((state) => ({
      moments: sortMoments([...state.moments, moment]),
      lastSavedAt: new Date(),
    })),

  deleteMoment: (id) =>
    set((state) => {
      const moments = reindexMoments(state.moments.filter((moment) => moment.id !== id))
      return {
        moments,
        activeMomentIndex:
          state.activeMomentIndex !== null && state.activeMomentIndex < moments.length
            ? state.activeMomentIndex
            : null,
        lastSavedAt: new Date(),
      }
    }),

  reorderMoments: (orderedMoments) =>
    set((state) => {
      if (orderedMoments.length === 0) {
        return { moments: [], activeMomentIndex: null, lastSavedAt: new Date() }
      }

      const nextMoments = typeof orderedMoments[0] === 'string'
        ? (orderedMoments as string[])
            .map((id) => state.moments.find((moment) => moment.id === id))
            .filter((moment): moment is PresentationMoment => Boolean(moment))
        : (orderedMoments as PresentationMoment[])

      return {
        moments: reindexMoments(nextMoments),
        activeMomentIndex: null,
        lastSavedAt: new Date(),
      }
    }),

  setSaving: (isSaving) => set({ isSaving }),

  markSaved: (savedAt = new Date()) =>
    set({
      isSaving: false,
      lastSavedAt: savedAt,
    }),
}))
