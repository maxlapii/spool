import { describe, expect, it } from 'vitest'
import { audioGain, clipContext, evaluateLayer, interpolateKeyframes, visibleRange } from '../animation'
import { ease } from '../easing'
import { createClip, createTextLayer } from '../project'
import type { Keyframe } from '@/types'

const kf = (property: Keyframe['property'], time: number, value: number, easing: Keyframe['easing'] = 'linear'): Keyframe => ({ id: `${property}${time}`, property, time, value, easing })

describe('interpolateKeyframes', () => {
  it('returns the fallback without keyframes and holds the ends', () => {
    expect(interpolateKeyframes([], 'x', 1, 42)).toBe(42)
    const kfs = [kf('x', 1, 10), kf('x', 3, 30)]
    expect(interpolateKeyframes(kfs, 'x', 0, 0)).toBe(10)
    expect(interpolateKeyframes(kfs, 'x', 5, 0)).toBe(30)
  })
  it('interpolates linearly and with easing', () => {
    expect(interpolateKeyframes([kf('x', 0, 0), kf('x', 2, 100)], 'x', 1, 0)).toBe(50)
    const eased = interpolateKeyframes([kf('x', 0, 0), kf('x', 2, 100, 'ease-in')], 'x', 1, 0)
    expect(eased).toBeCloseTo(100 * ease('ease-in', 0.5))
  })
})

describe('easing', () => {
  it('starts at 0 and ends at 1 for every preset', () => {
    for (const e of ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'expo-out', 'quart-out', 'sine-in-out', 'smooth', 'back-out', 'bounce'] as const) {
      expect(ease(e, 0)).toBeCloseTo(0)
      expect(ease(e, 1)).toBeCloseTo(1)
    }
  })
})

describe('evaluateLayer', () => {
  const layer = createTextLayer({ content: 'x' }, { transform: { x: 100, y: 200, width: 300, height: 50 }, animations: { in: { preset: 'fade', duration: 1, easing: 'linear', delay: 0 }, out: { preset: 'fade', duration: 1, easing: 'linear' }, keyframes: [] } })
  const clip = createClip({ trackId: 't', name: 'x', start: 2, duration: 4, layerId: layer.id })

  it('is invisible outside the clip range', () => {
    expect(evaluateLayer(layer, clip, 1).visible).toBe(false)
    expect(evaluateLayer(layer, clip, 6).visible).toBe(false)
  })
  it('fades in and out with the presets', () => {
    expect(evaluateLayer(layer, clip, 2.5).opacity).toBeCloseTo(0.5)
    expect(evaluateLayer(layer, clip, 4).opacity).toBeCloseTo(1)
    expect(evaluateLayer(layer, clip, 5.5).opacity).toBeCloseTo(0.5)
  })
  it('applies keyframes relative to the clip start', () => {
    const animated = { ...layer, animations: { ...layer.animations, in: { ...layer.animations.in, preset: 'none' as const }, keyframes: [kf('x', 0, 0), kf('x', 2, 200)] } }
    expect(evaluateLayer(animated, clip, 3).x).toBe(100)
  })
  it('extends visibility across a transition and crossfades', () => {
    const a = createClip({ trackId: 't', name: 'a', start: 0, duration: 4, layerId: 'la' })
    const b = createClip({ trackId: 't', name: 'b', start: 4, duration: 4, layerId: 'lb', transitionIn: { type: 'crossfade', duration: 1 } })
    const ctxA = clipContext(a, [a, b])
    const ctxB = clipContext(b, [a, b])
    expect(visibleRange(a, ctxA)).toEqual({ start: 0, end: 4.5 })
    expect(visibleRange(b, ctxB)).toEqual({ start: 3.5, end: 8 })
    const plain = { ...layer, animations: { ...layer.animations, in: { ...layer.animations.in, preset: 'none' as const }, out: { ...layer.animations.out, preset: 'none' as const } } }
    // The outgoing clip stays opaque underneath while the incoming one fades in on top: no dip to the background.
    expect(evaluateLayer(plain, a, 4, ctxA).opacity).toBeCloseTo(1)
    expect(evaluateLayer(plain, b, 4, ctxB).opacity).toBeCloseTo(0.5)
  })
})

describe('audioGain', () => {
  it('applies volume and fades', () => {
    const clip = createClip({ trackId: 'a', name: 'song', start: 1, duration: 10, audio: { assetId: 'x', volume: 0.8, fadeIn: 2, fadeOut: 2, muted: false } })
    expect(audioGain(clip, 0.5)).toBe(0)
    expect(audioGain(clip, 2)).toBeCloseTo(0.4)
    expect(audioGain(clip, 6)).toBeCloseTo(0.8)
    expect(audioGain(clip, 10)).toBeCloseTo(0.4)
    expect(audioGain({ ...clip, audio: { ...clip.audio!, muted: true } }, 6)).toBe(0)
  })
})
