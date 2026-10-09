import { beforeEach, describe, expect, it } from 'vitest'
import { useEditor } from '@/store/editorStore'
import { createEmptyProject } from '../project'
import { executeTool } from '../toolExecutor'

describe('executeTool', () => {
  beforeEach(() => useEditor.getState().loadProject(createEmptyProject('ai')))

  it('reads the project summary', () => {
    const r = executeTool('get_project_summary', {})
    expect(r.ok).toBe(true)
    expect((r.result as { composition: { width: number } }).composition.width).toBe(1920)
  })

  it('creates layers through the shared operations and reports ids', () => {
    const r = executeTool('create_text_layer', { content: 'Hello world', start: 0, duration: 3, animationIn: { preset: 'slide-up' } })
    expect(r.ok).toBe(true)
    const { clipId, layerId } = r.result as { clipId: string; layerId: string }
    const p = useEditor.getState().project!
    expect(p.clips.find((c) => c.id === clipId)?.layerId).toBe(layerId)
    expect(p.layers[0].animations.in.preset).toBe('slide-up')
  })

  it('rejects unknown tools, invalid input and unknown ids without touching the project', () => {
    const before = useEditor.getState().project
    expect(executeTool('explode_project', {}).ok).toBe(false)
    expect(executeTool('move_clip', { clipId: 'missing', start: 1 }).ok).toBe(false)
    expect(executeTool('create_text_layer', { content: '' }).ok).toBe(false)
    expect(executeTool('update_layer', { layerId: 'x', opacity: 5 }).ok).toBe(false)
    expect(useEditor.getState().project).toBe(before)
  })

  it('applies a sequence of edits as one undo step when a snapshot is taken first', () => {
    const s = useEditor.getState()
    s.snapshot()
    const a = executeTool('create_shape_layer', { shape: 'rect', start: 0, duration: 2 })
    const layerId = (a.result as { layerId: string }).layerId
    executeTool('update_layer', { layerId, x: 10, y: 20, shape: { fill: '#ff0000' } })
    executeTool('add_marker', { time: 1, label: 'Intro' })
    const p = useEditor.getState().project!
    expect(p.layers).toHaveLength(1)
    expect(p.layers[0].transform.x).toBe(10)
    expect(p.markers).toHaveLength(1)
    s.undo()
    expect(useEditor.getState().project!.layers).toHaveLength(0)
    expect(useEditor.getState().project!.markers).toHaveLength(0)
  })

  it('moves the playhead for preview requests', () => {
    executeTool('request_preview_update', { time: 4 })
    expect(useEditor.getState().playhead).toBe(4)
  })
})
