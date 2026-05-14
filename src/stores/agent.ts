import { create } from 'zustand'

interface AgentState {
  // Add agent state here
}

export const useAgentStore = create<AgentState>(() => ({}))
