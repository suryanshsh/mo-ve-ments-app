import { create } from 'zustand'
import type { MomentEmotion, PresentationStatus } from '@/lib/supabase/types'

export type SourceCitation = string | Record<string, unknown>

export type SourceVerificationStatus = 'verified' | 'partial' | 'uncited' | 'clean'

export type SourceVerification = {
  status: SourceVerificationStatus
  uncitedClaims: string[]
}

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
  _verification?: SourceVerification
}

type MomentUpdate = Partial<Omit<PresentationMoment, 'id'>>

interface PresentationState {
  presentation: PresentationSummary | null
  moments: PresentationMoment[]
  activeMomentIndex: number | null
  isSaving: boolean
  lastSavedAt: Date | null
  saveError: string | null
  dirtyMomentIds: Set<string>
  setPresentation: (presentation: PresentationSummary | null) => void
  setMoments: (moments: PresentationMoment[]) => void
  setActiveMoment: (index: number | null) => void
  updateMoment: (id: string, update: MomentUpdate) => void
  addMoment: (moment: PresentationMoment) => void
  deleteMoment: (id: string) => void
  reorderMoments: (orderedMoments: PresentationMoment[] | string[]) => void
  markMomentDirty: (id: string) => void
  clearDirtyMoments: (ids?: string[]) => void
  setSaving: (isSaving: boolean) => void
  setSaveError: (error: string | null) => void
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
  saveError: null,
  dirtyMomentIds: new Set<string>(),

  setPresentation: (presentation) =>
    set({
      presentation,
      isSaving: false,
      lastSavedAt: presentation ? new Date() : null,
      saveError: null,
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
    set((state) => {
      const dirtyMomentIds = new Set(state.dirtyMomentIds)
      dirtyMomentIds.add(id)

      return {
        moments: state.moments.map((moment) =>
          moment.id === id ? { ...moment, ...update, id: moment.id } : moment
        ),
        dirtyMomentIds,
        isSaving: true,
        saveError: null,
      }
    }),

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
        return { moments: [], activeMomentIndex: null }
      }

      const nextMoments = typeof orderedMoments[0] === 'string'
        ? (orderedMoments as string[])
            .map((id) => state.moments.find((moment) => moment.id === id))
            .filter((moment): moment is PresentationMoment => Boolean(moment))
        : (orderedMoments as PresentationMoment[])

      const moments = reindexMoments(nextMoments)
      const dirtyMomentIds = new Set(state.dirtyMomentIds)
      moments.forEach((moment) => dirtyMomentIds.add(moment.id))

      return {
        moments,
        dirtyMomentIds,
        activeMomentIndex: null,
        isSaving: true,
        saveError: null,
      }
    }),

  markMomentDirty: (id) =>
    set((state) => {
      const dirtyMomentIds = new Set(state.dirtyMomentIds)
      dirtyMomentIds.add(id)

      return {
        dirtyMomentIds,
        isSaving: true,
        saveError: null,
      }
    }),

  clearDirtyMoments: (ids) =>
    set((state) => {
      if (!ids) {
        return { dirtyMomentIds: new Set<string>() }
      }

      const dirtyMomentIds = new Set(state.dirtyMomentIds)
      ids.forEach((id) => dirtyMomentIds.delete(id))

      return { dirtyMomentIds }
    }),

  setSaving: (isSaving) =>
    set((state) => ({
      isSaving,
      saveError: isSaving ? null : state.saveError,
    })),

  setSaveError: (error) =>
    set({
      saveError: error,
      isSaving: false,
    }),

  markSaved: (savedAt = new Date()) =>
    set({
      isSaving: false,
      lastSavedAt: savedAt,
      saveError: null,
    }),
}))
