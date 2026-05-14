import { create } from 'zustand'

interface PresentationState {
  // Add presentation state here
}

export const usePresentationStore = create<PresentationState>(() => ({}))
