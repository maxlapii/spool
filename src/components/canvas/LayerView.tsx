import { useEffect, useRef } from 'react'
import type { Asset, Clip, Layer } from '@/types'
import type { RenderState } from '@/engine/animation'
import { useEditor } from '@/store/editorStore'
import { speedAt } from '@/engine/speed'

interface Props {
  layer: Layer
  clip: Clip
  state: RenderState
  asset?: Asset
  trackMuted?: boolean
}

/** Keeps a <video> element in sync with the playhead and playback state. */
function useVideoSync(ref: React.RefObject<HTMLVideoElement | null>, clip: Clip, muted: boolean, volume: number) {
  const playhead = useEditor((s) => s.playhead)
  const isPlaying = useEditor((s) => s.isPlaying)
  const speed = useEditor((s) => (s.project ? speedAt(s.project, s.playhead) : 1))
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.playbackRate = Math.min(16, Math.max(0.0625, speed))
    const target = Math.max(0, playhead - clip.start + clip.trimIn)
    v.muted = muted
    v.volume = Math.max(0, Math.min(1, volume))
    if (isPlaying) {
      if (Math.abs(v.currentTime - target) > 0.3) v.currentTime = target
      if (v.paused) v.play().catch(() => {})
    } else {
      if (!v.paused) v.pause()
      if (Math.abs(v.currentTime - target) > 1 / 60) v.currentTime = target
    }
  }, [ref, playhead, isPlaying, clip.start, clip.trimIn, muted, volume, speed])
  useEffect(() => {
    const v = ref.current
    return () => { v?.pause() }
  }, [ref])
}

function VideoContent({ layer, clip, asset, trackMuted }: { layer: Extract<Layer, { type: 'video' }>; clip: Clip; asset?: Asset; trackMuted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useVideoSync(ref, clip, layer.media.muted || !!trackMuted, layer.media.volume)
  if (!asset) return <MissingAsset />
  return (
    <video
      ref={ref}
      src={asset.url}
      playsInline
      preload="auto"
      className="h-full w-full"
      style={{ objectFit: layer.media.fit, borderRadius: layer.media.borderRadius }}
      draggable={false}
    />
  )
}

function MissingAsset() {
  return <div className="flex h-full w-full items-center justify-center bg-well text-[24px] text-ink-muted">Missing asset</div>
}

export function LayerContent({ layer, clip, asset, trackMuted }: Omit<Props, 'state'>) {
  switch (layer.type) {
    case 'text': {
      const t = layer.text
      return (
        <div
          className="h-full w-full whitespace-pre-wrap break-words"
          style={{
            fontFamily: `"${t.fontFamily}", sans-serif`,
            fontSize: t.fontSize,
            fontWeight: t.fontWeight,
            fontStyle: t.italic ? 'italic' : 'normal',
            color: t.color,
            textAlign: t.align,
            lineHeight: t.lineHeight,
            letterSpacing: t.letterSpacing,
            backgroundColor: t.backgroundColor ?? 'transparent',
            padding: t.padding,
            borderRadius: t.borderRadius,
            textShadow: t.shadow && t.shadow > 0 ? `0 ${Math.max(1, Math.round(t.shadow * 0.25))}px ${t.shadow}px rgba(0,0,0,0.45)` : undefined,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: t.align === 'left' ? 'flex-start' : t.align === 'right' ? 'flex-end' : 'center',
          }}
        >
          <span style={{ width: '100%' }}>{t.content}</span>
        </div>
      )
    }
    case 'shape': {
      const s = layer.shape
      const border = s.strokeWidth > 0 ? `${s.strokeWidth}px solid ${s.stroke}` : undefined
      const fill = shapeBackground(s)
      if (s.shape === 'ellipse') return <div className="h-full w-full" style={{ background: fill, border, borderRadius: '50%' }} />
      if (s.shape === 'line') {
        return (
          <div className="flex h-full w-full items-center">
            <div className="w-full" style={{ height: Math.max(2, s.strokeWidth || 6), background: fill, borderRadius: s.borderRadius }} />
          </div>
        )
      }
      if (s.shape === 'triangle') {
        return (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <polygon points="50,2 98,98 2,98" fill={s.fill} stroke={s.strokeWidth > 0 ? s.stroke : 'none'} strokeWidth={s.strokeWidth} vectorEffect="non-scaling-stroke" />
          </svg>
        )
      }
      return <div className="h-full w-full" style={{ background: fill, border, borderRadius: s.borderRadius }} />
    }
    case 'image':
      if (!asset) return <MissingAsset />
      return <img src={asset.url} alt={layer.name} className="h-full w-full" style={{ objectFit: layer.media.fit, borderRadius: layer.media.borderRadius }} draggable={false} />
    case 'video':
      return <VideoContent layer={layer} clip={clip} asset={asset} trackMuted={trackMuted} />
  }
}

/** CSS background for a shape: a solid fill or its gradient. */
function shapeBackground(s: Extract<Layer, { type: 'shape' }>['shape']): string {
  const g = s.gradient
  if (!g) return s.fill
  if (g.type === 'radial') return `radial-gradient(circle farthest-corner at center, ${s.fill} 45%, ${g.to} 100%)`
  return `linear-gradient(${g.angle}deg, ${s.fill}, ${g.to})`
}

/** Positions a layer in composition space according to its evaluated render state. */
export function layerStyle(state: RenderState): React.CSSProperties {
  return {
    ...(state.blur > 0.2 ? { filter: `blur(${state.blur}px)` } : {}),
    ...(state.clip < 0.999 ? { clipPath: `inset(0 ${(1 - state.clip) * 100}% 0 0)` } : {}),
    position: 'absolute',
    left: 0,
    top: 0,
    width: state.width,
    height: state.height,
    transform: `translate(${state.x + state.dx}px, ${state.y + state.dy}px) rotate(${state.rotation}deg) scale(${state.scale})`,
    transformOrigin: 'center center',
    opacity: state.opacity,
    willChange: 'transform, opacity',
  }
}
