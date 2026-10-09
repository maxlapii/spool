/**
 * Spool project model.
 * Shared by the client editor, the server, and the Claude tool layer.
 * All times are in seconds. All positions/sizes are in composition pixels.
 */

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3'

export const ASPECT_PRESETS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '16:9': { width: 1920, height: 1080, label: 'Landscape · 16:9' },
  '9:16': { width: 1080, height: 1920, label: 'Vertical · 9:16' },
  '1:1': { width: 1080, height: 1080, label: 'Square · 1:1' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait · 4:5' },
  '4:3': { width: 1440, height: 1080, label: 'Classic · 4:3' },
}

/** Visual tracks hold any visual layer (text, shape, image, video). Audio tracks hold audio clips. Track order = z-order (top track is frontmost). */
/** Longest composition the editor and exporter support (5 minutes). */
/** Slowest and fastest speed for the whole video and for any one section. */
export const MIN_SPEED = 0.25
export const MAX_SPEED = 4
/** Longest exported video in seconds once speed changes are applied. */
export const MAX_OUTPUT_SECONDS = 1200
export const MAX_COMPOSITION_DURATION = 300

export type TrackKind = 'visual' | 'audio'
export type LayerType = 'text' | 'shape' | 'image' | 'video'
export type AssetType = 'image' | 'video' | 'audio'

export type Easing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'expo-out' | 'quart-out' | 'sine-in-out' | 'smooth' | 'back-out' | 'bounce'
export const EASINGS: Easing[] = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'expo-out', 'quart-out', 'sine-in-out', 'smooth', 'back-out', 'bounce']

export type AnimationPreset =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'rotate'
  | 'pop'
  | 'rise'
  | 'blur-in'
  | 'wipe'
  | 'zoom-out'
  | 'drift'
export const ANIMATION_PRESETS: AnimationPreset[] = [
  'none', 'fade', 'rise', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'drift', 'scale', 'zoom-out', 'blur-in', 'wipe', 'rotate', 'pop',
]

export type TransitionType = 'none' | 'crossfade' | 'blur-dissolve' | 'fade-black' | 'wipe' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom'
export const TRANSITION_TYPES: TransitionType[] = ['none', 'crossfade', 'blur-dissolve', 'fade-black', 'wipe', 'slide-left', 'slide-right', 'slide-up', 'zoom']

export type KeyframeProperty = 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'scale'
export const KEYFRAME_PROPERTIES: KeyframeProperty[] = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'scale']

export interface Asset {
  id: string
  name: string
  type: AssetType
  mime: string
  size: number
  /** Server URL (e.g. /assets/abc.mp4). Stays valid across sessions. */
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  duration?: number
  createdAt: string
}

export interface Track {
  id: string
  name: string
  kind: TrackKind
  locked: boolean
  hidden: boolean
  muted: boolean
}

export interface Transform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export interface Keyframe {
  id: string
  property: KeyframeProperty
  /** Seconds relative to the clip start. */
  time: number
  value: number
  easing: Easing
}

export interface EntranceAnimation {
  preset: AnimationPreset
  duration: number
  easing: Easing
  /** Optional delay after the clip start, in seconds. */
  delay?: number
}

export interface Animations {
  in: EntranceAnimation
  out: EntranceAnimation
  keyframes: Keyframe[]
}

export type TextAlign = 'left' | 'center' | 'right'
export type FontWeight = 400 | 500 | 600 | 700 | 800

export interface TextProps {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: FontWeight
  color: string
  align: TextAlign
  lineHeight: number
  letterSpacing: number
  italic: boolean
  backgroundColor: string | null
  padding: number
  borderRadius: number
  /** Soft drop-shadow blur in px (0 or undefined = none); keeps subtitles readable over footage. */
  shadow?: number
}

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'triangle'

export interface ShapeProps {
  shape: ShapeKind
  fill: string
  stroke: string
  strokeWidth: number
  borderRadius: number
  /** Optional gradient from `fill` to `to`. Linear angle follows CSS (0 = to top, 90 = to right, 180 = to bottom). */
  gradient?: { to: string; angle: number; type?: 'linear' | 'radial' }
}

export interface MediaProps {
  assetId: string
  fit: 'cover' | 'contain' | 'fill'
  borderRadius: number
  /** Video only */
  volume: number
  muted: boolean
}

interface LayerBase {
  id: string
  name: string
  transform: Transform
  opacity: number
  locked: boolean
  hidden: boolean
  animations: Animations
}

export type Layer =
  | (LayerBase & { type: 'text'; text: TextProps })
  | (LayerBase & { type: 'shape'; shape: ShapeProps })
  | (LayerBase & { type: 'image'; media: MediaProps })
  | (LayerBase & { type: 'video'; media: MediaProps })

export interface Transition {
  type: TransitionType
  duration: number
}

export interface AudioSettings {
  assetId: string
  volume: number
  fadeIn: number
  fadeOut: number
  muted: boolean
}

export interface Clip {
  id: string
  trackId: string
  name: string
  /** Timeline start, seconds. */
  start: number
  /** Timeline duration, seconds. */
  duration: number
  /** Source offset for media clips (seconds into the asset). */
  trimIn: number
  /** Visual clips point at a layer. */
  layerId?: string
  /** Audio clips carry their audio settings. */
  audio?: AudioSettings
  /** Transition into this clip from the previous clip on the same track. */
  transitionIn?: Transition
}

export interface Marker {
  id: string
  time: number
  label: string
  color: string
  /** Playback speed of the section that starts at this marker (1 = normal). */
  speed?: number
}

export interface Composition {
  width: number
  height: number
  aspect: AspectRatio
  fps: number
  duration: number
  backgroundColor: string
  backgroundAssetId: string | null
  /** Speed of the whole video (1 = normal); multiplied with each section's speed. */
  speed?: number
}

export interface ExportSettings {
  width: number
  height: number
  fps: number
  format: 'mp4' | 'webm'
  quality: 'high' | 'medium' | 'low'
}

export interface Project {
  id: string
  name: string
  version: 1
  createdAt: string
  updatedAt: string
  composition: Composition
  assets: Asset[]
  tracks: Track[]
  clips: Clip[]
  layers: Layer[]
  markers: Marker[]
  export: ExportSettings
}

export interface ProjectSummary {
  id: string
  name: string
  updatedAt: string
  createdAt: string
  aspect: AspectRatio
  duration: number
  clipCount: number
}
