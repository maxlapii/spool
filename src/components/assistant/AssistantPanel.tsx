import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Bot, Check, Loader2, RotateCcw, Send, Sparkles, Square, Trash2, X } from 'lucide-react'
import { useAssistant } from '@/store/assistantStore'

const SUGGESTIONS = [
  'Create a professional 15-second product promo',
  'Make the opening more dynamic',
  'Add an animated title at the beginning',
  'Use a modern sans-serif font throughout',
  'Make this composition vertical for Reels',
  'Add a smooth fade between the scenes',
  'Make the text animations slower',
  'Create a clean end card with a call to action',
  'Make all elements align neatly',
  'Add upbeat background music to the whole video',
  'Speed up the whole video to 1.5x',
  'Suggest improvements to this video',
]

export function AssistantPanel() {
  const { status, model, account, cliFound, messages, busy, activity, focusRequest, checkStatus, send, cancel, undoTurn, clear } = useAssistant()
  const [prompt, setPrompt] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { void checkStatus() }, [checkStatus])
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages, activity])
  useEffect(() => { if (focusRequest && status === 'connected') inputRef.current?.focus() }, [focusRequest, status])

  const submit = (text: string) => {
    const t = text.trim()
    if (!t || busy) return
    setPrompt('')
    void send(t)
  }

  const dot = status === 'connected' ? 'bg-brand-teal' : status === 'checking' ? 'bg-line-strong' : 'bg-brand-orange'
  const statusLabel = status === 'connected' ? `Claude Code${account ? ` · ${account}` : ''}` : status === 'checking' ? 'Checking…' : status === 'offline' ? 'API server offline' : 'Not signed in'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent"><Bot size={15} /></span>
          <div>
            <p className="text-[13px] font-bold leading-tight">Claude</p>
            <p className="flex items-center gap-1 text-[10.5px] text-ink-muted" title={model ?? undefined}><span className={`inline-block h-1.5 w-1.5 rounded-full ${dot} ${status === 'checking' ? 'pulse-dot' : ''}`} /> {statusLabel}</p>
          </div>
        </div>
        {messages.length > 0 && <button className="icon-btn" title="New conversation" onClick={clear} disabled={busy}><Trash2 size={13} /></button>}
      </div>

      {status !== 'connected' && status !== 'checking' && (
        <div className="notice m-3">
          <p className="font-semibold">{status === 'offline' ? 'The API server is not running.' : cliFound ? 'Claude Code is not signed in.' : 'Claude Code was not found.'}</p>
          {status === 'offline' ? (
            <p className="mt-1">Start it with <code>npm run dev</code>. The editor keeps working without it.</p>
          ) : cliFound ? (
            <p className="mt-1">Run <code>claude</code> in a terminal and sign in, then re-check. The assistant uses your Claude Code subscription — no API key needed.</p>
          ) : (
            <p className="mt-1">Install Claude Code (<code>npm i -g @anthropic-ai/claude-code</code>), run <code>claude</code> once to sign in, then re-check.</p>
          )}
          <button className="btn mt-2 h-8 px-2.5 text-[11px]" onClick={() => void checkStatus()}>Re-check</button>
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto scroll-thin px-3 py-3">
        {messages.length === 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted"><Sparkles size={12} /> Try asking</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="rounded-lg border border-line bg-panel px-2.5 py-1.5 text-left text-[11.5px] font-medium text-ink hover:bg-accent-soft hover:text-accent disabled:opacity-50" disabled={status !== 'connected' || busy} onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
              Claude reads the project, then edits it with the same operations you use. Every change lands on the timeline and canvas and can be undone in one step.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  <div className="max-w-[90%] rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[12px] text-panel">{m.text}</div>
                ) : (
                  <div className="space-y-2">
                    {m.text && <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-well px-3 py-2 text-[12px] leading-relaxed text-ink">{m.text}</div>}
                    {m.tools.length > 0 && (
                      <div className="rounded-xl border border-line bg-panel p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{m.tools.filter((t) => t.ok).length} edit{m.tools.filter((t) => t.ok).length === 1 ? '' : 's'} {m.reverted ? 'reverted' : 'applied'}</p>
                          {m.before && !m.reverted && (
                            <button className="flex items-center gap-1 text-[10.5px] font-semibold text-accent hover:underline" onClick={() => undoTurn(m.id)}><RotateCcw size={10} /> Undo changes</button>
                          )}
                        </div>
                        <ul className="space-y-0.5">
                          {m.tools.map((t, i) => (
                            <li key={i} className={`flex items-start gap-1.5 text-[11px] ${t.ok ? 'text-ink' : 'text-danger'}`}>
                              {t.ok ? <Check size={11} className="mt-0.5 shrink-0 text-brand-teal" /> : <X size={11} className="mt-0.5 shrink-0" />}
                              <span>{t.summary}{!t.ok && (t.result as { error?: string })?.error ? ` — ${(t.result as { error?: string }).error}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.error && <p className="flex items-start gap-1 text-[11px] text-danger"><AlertCircle size={11} className="mt-0.5 shrink-0" /> {m.error}</p>}
                    {busy && m.id === messages[messages.length - 1].id && !m.error && (
                      <p className="flex items-center gap-1.5 text-[11px] text-ink-muted"><Loader2 size={11} className="animate-spin" /> {activity}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); submit(prompt) }}>
        <div className="flex items-end gap-1 rounded-2xl bg-well p-1 focus-within:ring-2 focus-within:ring-select/25">
          <textarea
            ref={inputRef}
            className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[12px] outline-none"
            placeholder={status === 'connected' ? 'Describe the edit you want…  (/)' : 'Sign in to Claude Code to start editing by prompt'}
            value={prompt}
            rows={1}
            disabled={status !== 'connected'}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(prompt) } }}
          />
          {busy ? (
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-panel" title="Stop" onClick={cancel}><Square size={12} /></button>
          ) : (
            <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-deep disabled:opacity-40" disabled={!prompt.trim() || status !== 'connected'} title="Send (Enter)"><Send size={13} /></button>
          )}
        </div>
      </form>
    </div>
  )
}
