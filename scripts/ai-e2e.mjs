// End-to-end check of the /api/ai/chat stream with scripted tool answers.
const base = process.env.API || 'http://localhost:4100'
const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)
const project = { composition: { width: 1920, height: 1080, aspect: '16:9', fps: 30, duration: 15, backgroundColor: '#fff' }, tracks: [{ id: 'track_a', name: 'Text', kind: 'visual' }], clips: [{ clipId: 'clip_1', name: 'Headline', trackId: 'track_a', start: 0, duration: 5, layer: { id: 'layer_1', type: 'text', text: 'Hello', x: 100, y: 100, width: 800, height: 200 } }], markers: [], assets: [] }
const res = await fetch(`${base}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Change the headline text to Ship faster and make it orange. Then preview it.', context: 'Current project state (JSON):\n' + JSON.stringify(project) }) })
const reader = res.body.getReader()
const dec = new TextDecoder()
let buf = ''
for (;;) {
  const { value, done } = await reader.read()
  if (done) break
  buf += dec.decode(value, { stream: true })
  let i
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1)
    if (!line.trim()) continue
    const ev = JSON.parse(line)
    log(ev.type, ev.type === 'tool_request' ? `${ev.name} ${JSON.stringify(ev.input).slice(0, 120)}` : ev.type === 'text' ? ev.text.slice(0, 120) : ev.type === 'error' ? ev.message : '')
    if (ev.type === 'tool_request') {
      const content = ev.name === 'get_project_summary' ? JSON.stringify(project) : JSON.stringify({ ok: true })
      const r = await fetch(`${base}/api/ai/tool-result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ev.id, content, isError: false }) })
      log('  -> tool-result', r.status)
    }
  }
}
log('stream closed')
