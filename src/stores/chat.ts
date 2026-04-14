import { create } from 'zustand'
import { getAuthenticatedClient } from '../lib/supabase'

export interface QuickAction {
  icon: string
  label: string
  action: 'add_planner' | 'add_grocery' | 'mark_complete' | 'view_insights' | 'navigate'
  data?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  tasks?: { icon: string; label: string }[]
  quickActions?: QuickAction[]
  cardType?: 'insight' | 'recommendation' | 'collaboration' | 'priority'
  timestamp: string
}

export type ChatTab = 'All' | 'Grocery' | 'Work' | 'Health' | 'Travel'

interface ChatStore {
  messages: Record<ChatTab, ChatMessage[]>
  activeChat: ChatTab
  chats: ChatTab[]
  isTyping: boolean
  setActiveChat: (c: ChatTab) => void
  sendMessage: (content: string) => void
  addSystemMessage: (tab: ChatTab, msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
}

const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: {
    All: [],
    Grocery: [],
    Work: [],
    Health: [],
    Travel: [],
  },
  activeChat: 'All',
  chats: ['All', 'Grocery', 'Work', 'Health', 'Travel'],
  isTyping: false,

  setActiveChat: (c) => set({ activeChat: c }),

  sendMessage: async (content) => {
    const tab = get().activeChat
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content,
      timestamp: time(),
    }
    
    set((s) => ({
      messages: { ...s.messages, [tab]: [...s.messages[tab], userMsg] },
      isTyping: true,
    }))

    try {
      const client = await getAuthenticatedClient()
      
      const history = get().messages[tab].map(m => ({
        role: m.role,
        content: m.content
      }))

      const { data, error } = await client.functions.invoke('assistant-chat', {
        body: { messages: history, tab }
      })

      if (error) throw error

      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'ai',
        timestamp: time(),
        content: data.content || "I didn't quite catch that. Can you rephrase?",
        cardType: data.cardType || undefined,
        tasks: data.tasks || undefined,
        quickActions: data.quickActions || undefined
      }

      set((s) => ({
        messages: { ...s.messages, [tab]: [...s.messages[tab], aiMsg] },
        isTyping: false,
      }))

    } catch (err: any) {
      console.error('[Chat] Failed to get AI response:', err)
      
      let errMsg = "I'm having trouble connecting to my servers right now. Please try again later."
      if (err?.message) {
        errMsg = `Error from AI: ${err.message}`
      }

      const errorMsg: ChatMessage = {
        id: Date.now().toString(), role: 'ai', timestamp: time(),
        content: errMsg,
      }
      set((s) => ({
        messages: { ...s.messages, [tab]: [...s.messages[tab], errorMsg] },
        isTyping: false,
      }))
    }
  },

  addSystemMessage: (tab, msg) => {
    const full: ChatMessage = { ...msg, id: Date.now().toString(), timestamp: time() }
    set((s) => ({
      messages: { ...s.messages, [tab]: [...s.messages[tab], full] },
    }))
  },
}))
