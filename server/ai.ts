/**
 * Claude assistant backed by the Claude Agent SDK, which uses the local
 * Claude Code sign-in (`claude` CLI) — no API key required. If
 * ANTHROPIC_API_KEY is set in the environment, Claude Code uses that instead.
 *
 * Protocol: POST /chat streams newline-delimited JSON events. Tool calls are
 * relayed to the browser as `tool_request` events; the browser executes them
 * against the live project and answers via POST /tool-result.
 */
import { Router } from 'express'
import { execFile } from 'node:child_process'
import crypto from 'node:crypto'
import { createSdkMcpServer, query, tool, type SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import { toolNames, toolSchemas } from '../shared/ai/tools'
import { APP_NAME, APP_SLUG } from '../shared/brand'
import { DATA_DIR } from './paths'

const router = Router()

const MODEL = process.env.CLAUDE_MODEL || undefined
const MAX_TURNS = 40
const TOOL_TIMEOUT_MS = 90_000

const SYSTEM_PROMPT = `You are the editing assistant inside ${APP_NAME}, a browser video editor. You edit the user's project by calling the ${APP_NAME} tools; you cannot write code, read files or touch anything outside the project.

How the project works
- The composition has a size in px (e.g. 1920×1080), an fps and a total duration in seconds (maximum 300s = 5 minutes). Coordinates are top-left based; x/y are the top-left corner of a layer.
- The timeline has tracks. Visual tracks hold clips that each point at one layer (text, shape, image, video). Track order is z-order: the first track listed is frontmost. Audio tracks hold audio clips. Clips on one track never overlap; new layers are placed on the first track with room.
- Every clip has start and duration in seconds. Layers can have an entrance ("in") and exit ("out") animation preset, keyframes (relative to the clip start) and a transition from the previous clip on the same track.
- Speed: use set_speed to speed up or slow down the whole video (target video) or one section (target section). A section runs from its marker to the next marker, so add markers first when the user names a part of the video that has none. Speeds are 0.25 to 4 (2 = twice as fast, 0.5 = half speed) and the exported video follows them, so say how long the result will be.
- Music: use add_sample_music for background music (royalty-free tracks; the tool description lists them with BPM). Pick fromSeconds to start at a chorus or drop.
- Natural motion: prefer entrance presets 'rise', 'blur-in', 'wipe' with easing 'expo-out' or 'quart-out', transitions 'blur-dissolve', 'crossfade' or 'wipe' (0.8–1.2s), and keep text readable over footage with a text shadow or a gradient scrim shape (fill rgba(0,0,0,0) to rgba(0,0,0,0.6), angle 180).
- Fonts available: Plus Jakarta Sans, Inter, Poppins, Space Grotesk, Playfair Display, DM Serif Display, JetBrains Mono, Georgia, Arial.

Working style
- The user message includes a project snapshot with real ids. Use those ids; never invent ids. Call get_project_summary again after big changes if you need fresh ids.
- Prefer a small number of well-chosen edits over many tiny ones. Make independent tool calls in parallel.
- When creating a composition from scratch (e.g. "make a 15-second promo"), build a complete, well-timed result: a background, 2–4 scenes separated by markers, a headline/subhead per scene, tasteful entrance/exit animations (0.5–0.9s), consistent typography and colours, and a closing call to action. Keep text readable: large sizes (60–120px for headlines on 1080p), high contrast, generous margins (at least 80px from the edges) and no overlapping text.
- Keep elements inside the composition bounds.
- After editing, call request_preview_update with a time that shows the most important change.
- Finish with a short, plain-language summary of what you changed (2–5 sentences, no markdown headers). If something was not possible with the available tools, say so honestly instead of pretending.
- If the request is ambiguous in a way that would produce very different results, ask one concise question instead of guessing.`

interface PendingTool {
  resolve: (r: { content: string; isError: boolean }) => void
  timer: NodeJS.Timeout
}
const pending = new Map<string, PendingTool>()

function claudeAuthStatus(): Promise<{ loggedIn: boolean; email?: string; authMethod?: string; cliFound: boolean }> {
  return new Promise((resolve) => {
    execFile('claude', ['auth', 'status'], { timeout: 8000 }, (err, stdout) => {
      if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') return resolve({ loggedIn: false, cliFound: false })
      try {
        const j = JSON.parse(stdout) as { loggedIn?: boolean; email?: string; authMethod?: string }
        resolve({ loggedIn: !!j.loggedIn, email: j.email, authMethod: j.authMethod, cliFound: true })
      } catch {
        resolve({ loggedIn: false, cliFound: true })
      }
    })
  })
}

router.get('/status', async (_req, res) => {
  const auth = await claudeAuthStatus()
  const configured = auth.loggedIn || !!process.env.ANTHROPIC_API_KEY
  res.json({ configured, provider: 'claude-code', model: MODEL ?? 'Claude Code default', ...auth })
})

router.post('/tool-result', (req, res) => {
  const { id, content, isError } = req.body as { id?: string; content?: string; isError?: boolean }
  const p = id ? pending.get(id) : undefined
  if (!p) return res.status(404).json({ error: 'Unknown or expired tool request' })
  clearTimeout(p.timer)
  pending.delete(id!)
  p.resolve({ content: typeof content === 'string' ? content : JSON.stringify(content ?? null), isError: !!isError })
  res.json({ ok: true })
})

router.post('/chat', async (req, res) => {
  const { prompt, sessionId, context } = req.body as { prompt?: string; sessionId?: string; context?: string }
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt is required' })

  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
  let closed = false
  const send = (event: Record<string, unknown>) => {
    if (!closed) res.write(JSON.stringify(event) + '\n')
  }
  const myRequests = new Set<string>()

  const tools = toolNames.map((name) =>
    tool(name, toolSchemas[name].description, toolSchemas[name].schema.shape, async (args) => {
      if (closed) return { content: [{ type: 'text' as const, text: '{"error":"The editor disconnected"}' }], isError: true }
      const id = crypto.randomUUID()
      myRequests.add(id)
      send({ type: 'tool_request', id, name, input: args })
      const result = await new Promise<{ content: string; isError: boolean }>((resolve) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          resolve({ content: '{"error":"The editor did not answer in time"}', isError: true })
        }, TOOL_TIMEOUT_MS)
        pending.set(id, { resolve, timer })
      })
      myRequests.delete(id)
      return { content: [{ type: 'text' as const, text: result.content }], isError: result.isError }
    }),
  )

  const studio = createSdkMcpServer({ name: APP_SLUG, version: '1.0.0', tools, alwaysLoad: true })
  const fullPrompt = context ? `${context}\n\nUser request: ${prompt}` : prompt

  const q = query({
    prompt: fullPrompt,
    options: {
      ...(sessionId ? { resume: sessionId } : {}),
      ...(MODEL ? { model: MODEL } : {}),
      systemPrompt: SYSTEM_PROMPT,
      tools: [],
      mcpServers: { [APP_SLUG]: studio },
      allowedTools: toolNames.map((n) => `mcp__${APP_SLUG}__${n}`),
      permissionMode: 'dontAsk',
      settingSources: [],
      maxTurns: MAX_TURNS,
      cwd: DATA_DIR,
      env: { ...process.env, CLAUDE_AGENT_SDK_CLIENT_APP: `${APP_SLUG}/0.1.0` },
      stderr: (data) => { if (process.env.AI_DEBUG) process.stderr.write(`[claude] ${data}`) },
    },
  })

  // Fires when the client disconnects (or after we finish). `req.on('close')` would fire
  // as soon as the JSON body is consumed, so it must not be used here.
  res.on('close', () => {
    if (closed) return
    closed = true
    for (const id of myRequests) {
      const p = pending.get(id)
      if (p) { clearTimeout(p.timer); pending.delete(id); p.resolve({ content: '{"error":"cancelled"}', isError: true }) }
    }
    q.interrupt().catch(() => {})
  })

  try {
    for await (const m of q as AsyncIterable<SDKMessage>) {
      if (closed) break
      if (m.type === 'system' && m.subtype === 'init') {
        send({ type: 'init', sessionId: m.session_id, model: m.model })
      } else if (m.type === 'system' && m.subtype === 'api_retry') {
        const wait = Math.round(m.retry_delay_ms / 1000)
        console.warn(`[claude] API retry ${m.attempt}/${m.max_retries} (status ${m.error_status ?? 'n/a'}), waiting ${wait}s`)
        send({ type: 'status', message: `Claude API hiccup (${m.error_status ?? 'no response'}), retrying in ${wait}s… (${m.attempt}/${m.max_retries})` })
      } else if (m.type === 'rate_limit_event') {
        const info = m.rate_limit_info
        if (info.status === 'rejected') {
          const resets = info.resetsAt ? ` Resets ${new Date(info.resetsAt * 1000).toLocaleTimeString()}.` : ''
          console.warn(`[claude] rate limit rejected (${info.rateLimitType ?? 'unknown'})`)
          send({ type: 'status', message: `Claude Code usage limit reached (${info.rateLimitType?.replace(/_/g, ' ') ?? 'plan limit'}).${resets}` })
        } else if (info.status === 'allowed_warning') {
          send({ type: 'status', message: `Approaching your Claude Code usage limit (${Math.round((info.utilization ?? 0) * 100)}% used)…` })
        }
      } else if (m.type === 'assistant') {
        for (const block of m.message.content) {
          if (block.type === 'text' && block.text.trim()) send({ type: 'text', text: block.text })
        }
        if (m.message.stop_reason === 'refusal') send({ type: 'error', message: 'Claude declined this request.' })
      } else if (m.type === 'result') {
        if (m.subtype === 'success') {
          send({ type: 'done', sessionId: m.session_id, durationMs: m.duration_ms, costUsd: m.total_cost_usd ?? null })
        } else {
          const errors = (m as { errors?: string[] }).errors ?? []
          send({ type: 'error', message: errors[0] ?? `Claude stopped (${m.subtype.replace(/_/g, ' ')})` })
          send({ type: 'done', sessionId: m.session_id, durationMs: m.duration_ms, costUsd: null })
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while talking to Claude Code'
    send({ type: 'error', message: /not logged in|auth|credential/i.test(message) ? `${message}. Run \`claude\` in a terminal and sign in, then try again.` : message })
  } finally {
    closed = true
    res.end()
  }
})

export default router
