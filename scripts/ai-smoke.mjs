// Quick check that the Claude Agent SDK can reach Claude through your local
// Claude Code sign-in and call a custom tool. Run: npm run ai:check
import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'

const server = createSdkMcpServer({
  name: 'studio',
  tools: [tool('get_number', 'Returns the secret number', {}, async () => ({ content: [{ type: 'text', text: '{"number": 42}' }] }))],
})
const t0 = Date.now()
const q = query({
  prompt: 'Call get_number and reply with just the number.',
  options: { systemPrompt: 'You are a terse test bot.', tools: [], mcpServers: { studio: server }, allowedTools: ['mcp__studio__get_number'], permissionMode: 'dontAsk', settingSources: [], maxTurns: 4 },
})
for await (const m of q) {
  if (m.type === 'system' && m.subtype === 'init') console.log('model:', m.model)
  else if (m.type === 'result') console.log(m.subtype === 'success' ? `OK — Claude answered "${m.result}" in ${Date.now() - t0}ms` : `FAILED: ${m.subtype}`)
}
