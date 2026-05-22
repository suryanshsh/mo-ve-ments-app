import { create } from 'zustand'

export type AgentMessage = {
  role: 'user' | 'agent'
  text: string
  timestamp: Date
}

type AgentMessageInput = {
  role: 'user' | 'agent'
  text: string
  timestamp?: Date | string
}

interface AgentState {
  messages: AgentMessage[]
  isThinking: boolean
  addMessage: (message: AgentMessageInput) => void
  setThinking: (isThinking: boolean) => void
  loadHistory: (messages: AgentMessageInput[]) => void
  clearHistory: () => void
}

const normalizeTimestamp = (timestamp: Date | string | undefined) => {
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp === 'string') return new Date(timestamp)
  return new Date()
}

const normalizeMessage = (message: AgentMessageInput): AgentMessage => ({
  role: message.role,
  text: message.text,
  timestamp: normalizeTimestamp(message.timestamp),
})

export const useAgentStore = create<AgentState>((set) => ({
  messages: [],
  isThinking: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, normalizeMessage(message)],
    })),

  setThinking: (isThinking) => set({ isThinking }),

  loadHistory: (messages) =>
    set({
      messages: messages.map(normalizeMessage),
      isThinking: false,
    }),

  clearHistory: () => set({ messages: [], isThinking: false }),
}))
