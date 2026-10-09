import { beforeEach, describe, expect, it } from 'vitest'
import { useEditor } from '@/store/editorStore'
import { createEmptyProject } from '../project'
import { addTextLayer, updateLayer } from '../operations'

describe('undo / redo', () => {
  beforeEach(() => useEditor.getState().loadProject(createEmptyProject('history')))

  it('records committed operations and restores them', () => {
    const s = useEditor.getState()
    s.commit((p) => addTextLayer(p, { content: 'one' }).project)
    s.commit((p) => addTextLayer(p, { content: 'two' }).project)
    expect(useEditor.getState().project!.layers).toHaveLength(2)
    s.undo()
    expect(useEditor.getState().project!.layers).toHaveLength(1)
    s.undo()
    expect(useEditor.getState().project!.layers).toHaveLength(0)
    s.undo() // nothing left: no-op
    expect(useEditor.getState().project!.layers).toHaveLength(0)
    s.redo()
    s.redo()
    expect(useEditor.getState().project!.layers).toHaveLength(2)
  })

  it('groups transient patches after a snapshot into one undo step', () => {
    const s = useEditor.getState()
    s.commit((p) => addTextLayer(p, { content: 'drag me' }).project)
    const id = useEditor.getState().project!.layers[0].id
    s.snapshot()
    for (let x = 1; x <= 5; x++) s.patch((p) => updateLayer(p, id, { transform: { x } }))
    expect(useEditor.getState().project!.layers[0].transform.x).toBe(5)
    s.undo()
    expect(useEditor.getState().project!.layers[0].transform.x).not.toBe(5)
    expect(useEditor.getState().project!.layers).toHaveLength(1)
  })

  it('clears the redo stack after a new commit', () => {
    const s = useEditor.getState()
    s.commit((p) => addTextLayer(p, { content: 'a' }).project)
    s.undo()
    s.commit((p) => addTextLayer(p, { content: 'b' }).project)
    expect(useEditor.getState().future).toHaveLength(0)
  })

  it('drops selection that no longer exists after undo', () => {
    const s = useEditor.getState()
    let clipId = ''
    s.commit((p) => { const r = addTextLayer(p, { content: 'a' }); clipId = r.clipId; return r.project })
    s.select([clipId])
    s.undo()
    expect(useEditor.getState().selectedClipIds).toEqual([])
  })
})
