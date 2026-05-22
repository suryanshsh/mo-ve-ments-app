'use client'

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { showToast } from '@/components/ui/Toast'
import { trpc } from '@/lib/trpc/client'
import { usePresentationStore, type PresentationMoment } from '@/stores/presentation'

const SAVE_DEBOUNCE_MS = 1500
const RETRY_DELAY_MS = 3000

const MOMENT_UPDATE_FIELDS = [
  'title',
  'emotion',
  'duration_seconds',
  'slide_heading',
  'slide_bullets',
  'script',
  'sources',
] as const

type MomentUpdateField = (typeof MOMENT_UPDATE_FIELDS)[number]
type MomentUpdateData = Partial<Pick<PresentationMoment, MomentUpdateField>>

const cloneMoment = (moment: PresentationMoment): PresentationMoment => ({
  ...moment,
  slide_bullets: [...moment.slide_bullets],
  sources: moment.sources.map((source) =>
    typeof source === 'object' && source !== null ? { ...source } : source
  ),
})

const createMomentMap = (moments: PresentationMoment[]) =>
  new Map(moments.map((moment) => [moment.id, cloneMoment(moment)]))

const isEqualValue = (first: unknown, second: unknown) =>
  JSON.stringify(first ?? null) === JSON.stringify(second ?? null)

const getChangedData = (
  currentMoment: PresentationMoment,
  savedMoment: PresentationMoment | undefined
) => {
  const data: MomentUpdateData = {}

  for (const field of MOMENT_UPDATE_FIELDS) {
    if (!savedMoment || !isEqualValue(currentMoment[field], savedMoment[field])) {
      Object.assign(data, { [field]: currentMoment[field] })
    }
  }

  return data
}

const hasPersistedChanges = (currentMoment: PresentationMoment, savedMoment: PresentationMoment) => {
  if (currentMoment.position !== savedMoment.position) {
    return true
  }

  return MOMENT_UPDATE_FIELDS.some((field) => !isEqualValue(currentMoment[field], savedMoment[field]))
}

export function useAutosave() {
  const updateMomentMutation = trpc.moment.update.useMutation()
  const batchUpdateMutation = trpc.moment.batchUpdate.useMutation()
  const debounceTimerRef = useRef<number | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const saveInFlightRef = useRef(false)
  const baselineMomentsRef = useRef(createMomentMap(usePresentationStore.getState().moments))
  const savePendingChangesRef = useRef<(isRetry?: boolean) => Promise<void>>(async () => {})

  const clearTimer = (timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const scheduleSave = useCallback(() => {
    clearTimer(debounceTimerRef)

    debounceTimerRef.current = window.setTimeout(() => {
      void savePendingChangesRef.current(false)
    }, SAVE_DEBOUNCE_MS)
  }, [])

  const savePendingChanges = useCallback(async (isRetry = false) => {
    if (saveInFlightRef.current) {
      scheduleSave()
      return
    }

    const state = usePresentationStore.getState()
    const dirtyIds = Array.from(state.dirtyMomentIds)

    if (dirtyIds.length === 0) {
      state.setSaving(false)
      return
    }

    const currentMomentById = new Map(state.moments.map((moment) => [moment.id, moment]))
    const snapshots = dirtyIds
      .map((id) => currentMomentById.get(id))
      .filter((moment): moment is PresentationMoment => Boolean(moment))
      .map(cloneMoment)

    const updatePayloads = snapshots
      .map((moment) => ({
        id: moment.id,
        data: getChangedData(moment, baselineMomentsRef.current.get(moment.id)),
      }))
      .filter(({ data }) => Object.keys(data).length > 0)

    const positionUpdates = snapshots
      .filter((moment) => moment.position !== baselineMomentsRef.current.get(moment.id)?.position)
      .map((moment) => ({ id: moment.id, position: moment.position }))

    if (updatePayloads.length === 0 && positionUpdates.length === 0) {
      state.clearDirtyMoments(dirtyIds)
      usePresentationStore.getState().markSaved()
      return
    }

    clearTimer(retryTimerRef)
    saveInFlightRef.current = true
    state.setSaving(true)

    try {
      if (positionUpdates.length > 0) {
        await batchUpdateMutation.mutateAsync({ updates: positionUpdates })
      }

      await Promise.all(
        updatePayloads.map(({ id, data }) => updateMomentMutation.mutateAsync({ id, data }))
      )

      snapshots.forEach((moment) => baselineMomentsRef.current.set(moment.id, cloneMoment(moment)))

      const latestState = usePresentationStore.getState()
      const idsToClear = snapshots
        .filter((savedSnapshot) => {
          const latestMoment = latestState.moments.find((moment) => moment.id === savedSnapshot.id)
          return !latestMoment || !hasPersistedChanges(latestMoment, savedSnapshot)
        })
        .map((moment) => moment.id)

      latestState.clearDirtyMoments(idsToClear)

      const nextState = usePresentationStore.getState()
      if (nextState.dirtyMomentIds.size === 0) {
        nextState.markSaved()
      } else {
        nextState.setSaving(true)
        scheduleSave()
      }
    } catch (error) {
      const message = isRetry ? 'Save failed' : 'Save failed — retrying'
      usePresentationStore.getState().setSaveError(message)
      showToast(
        isRetry
          ? 'Autosave still failed. Your local edits are still visible.'
          : 'Autosave failed. Retrying in a moment.',
        'error'
      )

      if (!isRetry) {
        retryTimerRef.current = window.setTimeout(() => {
          void savePendingChangesRef.current(true)
        }, RETRY_DELAY_MS)
      }

      console.error('[autosave] Failed to save moment changes:', error)
    } finally {
      saveInFlightRef.current = false
    }
  }, [batchUpdateMutation, scheduleSave, updateMomentMutation])

  useEffect(() => {
    savePendingChangesRef.current = savePendingChanges
  }, [savePendingChanges])

  useEffect(() => {
    const unsubscribe = usePresentationStore.subscribe((state, previousState) => {
      if (state.dirtyMomentIds.size === 0) {
        if (state.moments !== previousState.moments && !state.isSaving) {
          baselineMomentsRef.current = createMomentMap(state.moments)
        }
        return
      }

      if (
        state.moments !== previousState.moments ||
        state.dirtyMomentIds !== previousState.dirtyMomentIds
      ) {
        scheduleSave()
      }
    })

    return () => {
      unsubscribe()
      clearTimer(debounceTimerRef)
      clearTimer(retryTimerRef)
    }
  }, [scheduleSave])
}