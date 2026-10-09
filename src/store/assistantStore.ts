import { create } from 'zustand'
import type { Project } from '@/types'
import { useEditor } from './editorStore'
import { executeTool, summarizeProject, type ToolOutcome } from '@/engine/toolExecutor'
import { api, ApiError } from '@/services/api'
import { toolSchemas, isToolName } from '@shared/ai/tools'

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'offline'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools: ToolOutcome[]
  /** Project state before this assistant turn mutated anything (for "Undo changes"). */
  before?: Project
  reverted?: boolean
  error?: string
}

type StreamEvent =
  | { type: 'init'; sessionId: string; model?: string }
  | { type: 'text'; text: string }
  | { type: 'status'; message: string }
  | { type: 'tool_request'; id: string; name: string; input: unknown }
  | { type: 'done'; sessionId: string; durationMs?: number; costUsd?: number | null }
  | { type: 'error'; message: string }

interface AssistantState {
  status: ConnectionStatus
  model: string | null
  account: string | null
  cliFound: boolean
  messages: ChatMessage[]
  /** Claude Code session id, so follow-up prompts continue the conversation. */
  sessionId: string | null
  busy: boolean
  activity: string | null
  focusRequest: number
  checkStatus: () => Promise<void>
  send: (prompt: string) => Promise<void>
  cancel: () => void
  undoTurn: (messageId: string) => void
  clear: () => void
  requestFocus: () => void
}

let controller: AbortController | null = null

export const useAssistant = create<AssistantState>((set, get) => ({
  status: 'checking',
  model: null,
  account: null,
  cliFound: true,
  messages: [],
  sessionId: null,
  busy: false,
  activity: null,
  focusRequest: 0,

  checkStatus: async () => {
    try {
      const r = await api<{ configured: boolean; model: string; email?: string; cliFound: boolean }>('/api/ai/status')
      set({ status: r.configured ? 'connected' : 'disconnected', model: r.model, account: r.email ?? null, cliFound: r.cliFound })
    } catch {
      set({ status: 'offline', model: null })
    }
  },

  cancel: () => controller?.abort(),
  clear: () => set({ messages: [], sessionId: null }),
  requestFocus: () => set({ focusRequest: get().focusRequest + 1 }),

  undoTurn: (messageId) => {
    const msg = get().messages.find((m) => m.id === messageId)
    if (!msg?.before || msg.reverted) return
    const editor = useEditor.getState()
    editor.snapshot()
    editor.restore(msg.before)
    editor.clearSelection()
    set({ messages: get().messages.map((m) => (m.id === messageId ? { ...m, reverted: true } : m)) })
  },

  send: async (prompt) => {
    const editor = useEditor.getState()
    const project = editor.project
    if (!project || get().busy) return
    const userMsg: ChatMessage = { id: `m_${Date.now()}`, role: 'user', text: prompt, tools: [] }
    const assistantId = `m_${Date.now() + 1}`
    set({ messages: [...get().messages, userMsg, { id: assistantId, role: 'assistant', text: '', tools: [] }], busy: true, activity: 'Thinking…' })
    const update = (patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) =>
      set({ messages: get().messages.map((m) => (m.id === assistantId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)) })

    const selected = editor.selectedClipIds[0]
    const context = [
      'Current project state (JSON):',
      JSON.stringify(summarizeProject(project)),
      `Playhead: ${editor.playhead.toFixed(2)}s. Selected clip: ${selected ?? 'none'}.`,
    ].join('\n')

    const before = project
    let snapshotTaken = false
    controller = new AbortController()

    const handle = async (ev: StreamEvent) => {
      switch (ev.type) {
        case 'init':
          set({ sessionId: ev.sessionId, model: ev.model ?? get().model })
          break
        case 'text':
          update((m) => ({ text: [m.text, ev.text].filter(Boolean).join('\n\n') }))
          set({ activity: 'Working…' })
          break
        case 'tool_request': {
          const mutates = isToolName(ev.name) && toolSchemas[ev.name].mutates
          if (mutates && !snapshotTaken) {
            useEditor.getState().snapshot()
            snapshotTaken = true
            update({ before })
          }
          set({ activity: mutates ? 'Applying edits…' : 'Reading the project…' })
          const outcome = executeTool(ev.name, ev.input)
          if (mutates || !outcome.ok) update((m) => ({ tools: [...m.tools, outcome] }))
          await api('/api/ai/tool-result', { method: 'POST', body: JSON.stringify({ id: ev.id, content: JSON.stringify(outcome.result), isError: !outcome.ok }) })
          break
        }
        case 'status':
          set({ activity: ev.message })
          break
        case 'error':
          update({ error: ev.message })
          break
        case 'done':
          set({ sessionId: ev.sessionId })
          break
      }
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId: get().sessionId, context }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        let message = res.statusText
        try { message = (await res.json()).error ?? message } catch { /* ignore */ }
        throw new ApiError(res.status, message)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl: number
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (line) await handle(JSON.parse(line) as StreamEvent)
        }
      }
      if (buffer.trim()) await handle(JSON.parse(buffer) as StreamEvent)
    } catch (e) {
      const aborted = (e as Error).name === 'AbortError'
      update({ error: aborted ? 'Stopped. Edits applied so far are kept (use Undo changes to revert).' : (e as Error).message })
      if (e instanceof ApiError && e.status === 503) set({ status: 'disconnected' })
    } finally {
      controller = null
      set({ busy: false, activity: null })
    }
  },
}))
