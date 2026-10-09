import { describe, expect, it } from 'vitest'
import { parseToolInput, toolDefinitions, toolNames } from '../tools'

describe('Claude tool schemas', () => {
  it('produces an Anthropic tool definition for every tool', () => {
    const defs = toolDefinitions()
    expect(defs.map((d) => d.name)).toEqual(toolNames)
    for (const d of defs) {
      expect(d.description.length).toBeGreaterThan(10)
      expect(d.input_schema.type).toBe('object')
      expect('$schema' in d.input_schema).toBe(false)
    }
  })

  it('accepts valid inputs', () => {
    expect(parseToolInput('create_text_layer', { content: 'Hi', start: 1, duration: 3, style: { color: '#fff', fontWeight: 700 } })).toMatchObject({ content: 'Hi' })
    expect(parseToolInput('move_clip', { clipId: 'clip_1', start: 0 })).toEqual({ clipId: 'clip_1', start: 0 })
    expect(parseToolInput('update_composition', { aspect: '9:16', fps: 30 })).toEqual({ aspect: '9:16', fps: 30 })
  })

  it('rejects invalid ids, negative durations, bad colors and unsupported values', () => {
    expect(() => parseToolInput('move_clip', { clipId: '', start: 0 })).toThrow()
    expect(() => parseToolInput('set_clip_duration', { clipId: 'c', duration: -2 })).toThrow()
    expect(() => parseToolInput('create_text_layer', { content: 'x', style: { color: 'purple-ish' } })).toThrow()
    expect(() => parseToolInput('set_animation', { layerId: 'l', which: 'in', preset: 'explode' })).toThrow()
    expect(() => parseToolInput('add_keyframe', { layerId: 'l', property: 'z', time: 0, value: 1 })).toThrow()
    expect(() => parseToolInput('update_composition', { fps: 31 })).toThrow()
    expect(() => parseToolInput('update_layer', { layerId: 'l', opacity: 1.5 })).toThrow()
  })
})
