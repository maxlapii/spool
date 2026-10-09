import { describe, expect, it } from 'vitest'
import { formatTimecode, pxToTime, rulerInterval, snapToFrame, timeToPx } from '@/utils/time'
import { snapCandidates, snapTime } from '../snap'
import { createEmptyProject } from '../project'
import { addShapeLayer } from '../operations'

describe('time <-> px', () => {
  it('round-trips through the shared conversion', () => {
    expect(timeToPx(2.5, 80)).toBe(200)
    expect(pxToTime(200, 80)).toBe(2.5)
    expect(pxToTime(timeToPx(7.25, 33), 33)).toBeCloseTo(7.25)
  })
  it('formats timecodes', () => {
    expect(formatTimecode(0)).toBe('00:00.00')
    expect(formatTimecode(65.5, 30)).toBe('01:05.15')
  })
  it('snaps to frames', () => {
    expect(snapToFrame(1.017, 30)).toBeCloseTo(1.0333, 3)
  })
  it('picks readable ruler intervals', () => {
    expect(rulerInterval(60).major).toBe(2)
    expect(rulerInterval(400).major).toBe(0.25)
    expect(rulerInterval(10).major).toBe(10)
  })
})

describe('snapping', () => {
  it('collects clip edges, markers, playhead and composition end', () => {
    const p = addShapeLayer(createEmptyProject('t'), {}, {}, { start: 3, duration: 2 }).project
    const c = snapCandidates(p, 7.5)
    expect(c).toContain(3)
    expect(c).toContain(5)
    expect(c).toContain(7.5)
    expect(c).toContain(p.composition.duration)
  })
  it('snaps only within the threshold', () => {
    expect(snapTime(4.9, [5], 0.2)).toEqual({ time: 5, target: 5 })
    expect(snapTime(4.5, [5], 0.2)).toEqual({ time: 4.5, target: null })
  })
})
