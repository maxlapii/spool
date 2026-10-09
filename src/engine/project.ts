import type {
  Animations, AspectRatio, Clip, Composition, ExportSettings, Layer, MediaProps, Project, ShapeProps, TextProps, Track,
} from '@/types'
import { ASPECT_PRESETS } from '@/types'
import { APP_NAME } from '@shared/brand'
import { uid } from '@/utils/id'

export const DEFAULT_FPS = 30
export const DEFAULT_DURATION = 15
export const MIN_CLIP_DURATION = 0.1

export const FONT_FAMILIES = [
  'Plus Jakarta Sans', 'Inter', 'Poppins', 'Space Grotesk', 'Playfair Display', 'DM Serif Display', 'JetBrains Mono', 'Georgia', 'Arial',
]

export function defaultAnimations(): Animations {
  return {
    in: { preset: 'none', duration: 0.8, easing: 'expo-out', delay: 0 },
    out: { preset: 'none', duration: 0.6, easing: 'sine-in-out' },
    keyframes: [],
  }
}

export function defaultTextProps(overrides: Partial<TextProps> = {}): TextProps {
  return {
    content: 'Your text',
    fontFamily: 'Inter',
    fontSize: 64,
    fontWeight: 700,
    color: '#111827',
    align: 'center',
    lineHeight: 1.2,
    letterSpacing: 0,
    italic: false,
    backgroundColor: null,
    padding: 0,
    borderRadius: 0,
    ...overrides,
  }
}

export function defaultShapeProps(overrides: Partial<ShapeProps> = {}): ShapeProps {
  return { shape: 'rect', fill: '#9a5bf5', stroke: 'transparent', strokeWidth: 0, borderRadius: 16, ...overrides }
}

export function defaultMediaProps(assetId: string, overrides: Partial<MediaProps> = {}): MediaProps {
  return { assetId, fit: 'cover', borderRadius: 0, volume: 1, muted: false, ...overrides }
}

type LayerInit = { id?: string; name?: string; transform?: Partial<Layer['transform']>; opacity?: number; animations?: Partial<Animations> }

function baseLayer(init: LayerInit, name: string, size: { width: number; height: number }) {
  return {
    id: init.id ?? uid('layer'),
    name: init.name ?? name,
    transform: { x: 0, y: 0, width: size.width, height: size.height, rotation: 0, ...init.transform },
    opacity: init.opacity ?? 1,
    locked: false,
    hidden: false,
    animations: { ...defaultAnimations(), ...init.animations },
  }
}

export function createTextLayer(text: Partial<TextProps> = {}, init: LayerInit = {}): Layer {
  const props = defaultTextProps(text)
  return { ...baseLayer(init, props.content.slice(0, 24) || 'Text', { width: 800, height: 120 }), type: 'text', text: props }
}

export function createShapeLayer(shape: Partial<ShapeProps> = {}, init: LayerInit = {}): Layer {
  const props = defaultShapeProps(shape)
  const name = props.shape === 'rect' ? 'Rectangle' : props.shape === 'ellipse' ? 'Ellipse' : props.shape === 'line' ? 'Line' : 'Triangle'
  return { ...baseLayer(init, name, { width: 320, height: 320 }), type: 'shape', shape: props }
}

export function createMediaLayer(type: 'image' | 'video', assetId: string, media: Partial<MediaProps> = {}, init: LayerInit = {}): Layer {
  const props = defaultMediaProps(assetId, media)
  return { ...baseLayer(init, type === 'image' ? 'Image' : 'Video', { width: 960, height: 540 }), type, media: props }
}

export function createTrack(kind: Track['kind'], name: string, id?: string): Track {
  return { id: id ?? uid('track'), name, kind, locked: false, hidden: false, muted: false }
}

export function createClip(init: Partial<Clip> & { trackId: string; name: string }): Clip {
  return { id: uid('clip'), start: 0, duration: 4, trimIn: 0, ...init }
}

export function compositionForAspect(aspect: AspectRatio, overrides: Partial<Composition> = {}): Composition {
  const preset = ASPECT_PRESETS[aspect]
  return {
    width: preset.width,
    height: preset.height,
    aspect,
    fps: DEFAULT_FPS,
    duration: DEFAULT_DURATION,
    backgroundColor: '#ffffff',
    backgroundAssetId: null,
    ...overrides,
  }
}

export function defaultExportSettings(c: Composition): ExportSettings {
  return { width: c.width, height: c.height, fps: c.fps, format: 'mp4', quality: 'high' }
}

export function createEmptyProject(name = 'Untitled project', aspect: AspectRatio = '16:9'): Project {
  const now = new Date().toISOString()
  const composition = compositionForAspect(aspect)
  return {
    id: uid('proj'),
    name,
    version: 1,
    createdAt: now,
    updatedAt: now,
    composition,
    assets: [],
    tracks: [createTrack('visual', 'Text'), createTrack('visual', 'Graphics'), createTrack('visual', 'Media'), createTrack('audio', 'Audio')],
    clips: [],
    layers: [],
    markers: [],
    export: defaultExportSettings(composition),
  }
}

/** The end time of the last clip, or 0. */
export function contentEnd(project: Project): number {
  return project.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0)
}

/**
 * Original demo composition: a folder graphic with floating labels,
 * a headline, colour swatches and a CTA — every element is editable.
 */
export function createDemoProject(): Project {
  const project = createEmptyProject('Brand launch promo', '16:9')
  project.composition.backgroundColor = '#f4f1ea'
  project.composition.duration = 15
  project.export = defaultExportSettings(project.composition)

  // One clip per track per time range (like a real NLE). Tracks are listed front-to-back.
  const trackNames = ['Labels', 'Headline', 'Subhead', 'Accents', 'Details', 'Folder tab', 'Folder body', 'Backdrop']
  project.tracks = [...trackNames.map((n) => createTrack('visual', n)), createTrack('audio', 'Audio')]
  const T = Object.fromEntries(trackNames.map((n, i) => [n, project.tracks[i].id])) as Record<string, string>
  const add = (layer: Layer, trackId: string, start: number, duration: number, extra: Partial<Clip> = {}) => {
    project.layers.push(layer)
    project.clips.push(createClip({ trackId, name: layer.name, start, duration, layerId: layer.id, ...extra }))
    return layer
  }

  // --- Scene 1: intro (0–5s) ---
  add(
    createShapeLayer({ shape: 'ellipse', fill: '#ffd166' }, { name: 'Sun', transform: { x: 1420, y: 120, width: 260, height: 260 }, animations: { in: { preset: 'scale', duration: 0.8, easing: 'back-out' }, out: { preset: 'fade', duration: 0.4, easing: 'ease-in' } } }),
    T.Backdrop, 0, 5,
  )
  add(
    createShapeLayer({ shape: 'rect', fill: '#9a5bf5', borderRadius: 28 }, {
      name: 'Folder body',
      transform: { x: 260, y: 380, width: 560, height: 400 },
      animations: {
        in: { preset: 'slide-up', duration: 0.7, easing: 'ease-out' },
        out: { preset: 'fade', duration: 0.4, easing: 'ease-in' },
        keyframes: [
          { id: uid('kf'), property: 'y', time: 1, value: 380, easing: 'ease-in-out' },
          { id: uid('kf'), property: 'y', time: 3, value: 350, easing: 'ease-in-out' },
          { id: uid('kf'), property: 'y', time: 5, value: 380, easing: 'ease-in-out' },
        ],
      },
    }),
    T['Folder body'], 0, 5,
  )
  add(
    createShapeLayer({ shape: 'rect', fill: '#b08bf8', borderRadius: 18 }, {
      name: 'Folder tab',
      transform: { x: 260, y: 330, width: 240, height: 80 },
      animations: {
        in: { preset: 'slide-up', duration: 0.7, easing: 'ease-out', delay: 0.1 },
        out: { preset: 'fade', duration: 0.4, easing: 'ease-in' },
        keyframes: [
          { id: uid('kf'), property: 'y', time: 1, value: 330, easing: 'ease-in-out' },
          { id: uid('kf'), property: 'y', time: 3, value: 300, easing: 'ease-in-out' },
          { id: uid('kf'), property: 'y', time: 5, value: 330, easing: 'ease-in-out' },
        ],
      },
    }),
    T['Folder tab'], 0, 5,
  )
  add(
    createTextLayer({ content: 'Projects', fontSize: 28, color: '#ffffff', align: 'left', fontWeight: 600, backgroundColor: '#111827', padding: 14, borderRadius: 12 }, {
      name: 'Label · Projects',
      transform: { x: 700, y: 300, width: 220, height: 60 },
      animations: { in: { preset: 'slide-left', duration: 0.6, easing: 'back-out', delay: 0.5 }, out: { preset: 'fade', duration: 0.4, easing: 'ease-in' } },
    }),
    T.Labels, 0, 5,
  )
  add(
    createTextLayer({ content: 'Assets', fontSize: 28, color: '#111827', align: 'left', fontWeight: 600, backgroundColor: '#ffffff', padding: 14, borderRadius: 12 }, {
      name: 'Label · Assets',
      transform: { x: 760, y: 560, width: 190, height: 60 },
      animations: { in: { preset: 'slide-left', duration: 0.6, easing: 'back-out', delay: 0.8 }, out: { preset: 'fade', duration: 0.4, easing: 'ease-in' } },
    }),
    T.Accents, 0, 5,
  )
  add(
    createTextLayer({ content: 'Organize your work', fontFamily: 'Playfair Display', fontSize: 92, fontWeight: 700, color: '#111827', align: 'left', lineHeight: 1.05 }, {
      name: 'Headline',
      transform: { x: 1000, y: 420, width: 720, height: 240 },
      animations: { in: { preset: 'slide-up', duration: 0.8, easing: 'ease-out', delay: 0.3 }, out: { preset: 'fade', duration: 0.4, easing: 'ease-in' } },
    }),
    T.Headline, 0, 5,
  )
  add(
    createTextLayer({ content: 'A calm home for every file, note and idea.', fontSize: 34, fontWeight: 400, color: '#4b5563', align: 'left' }, {
      name: 'Subhead',
      transform: { x: 1000, y: 680, width: 760, height: 60 },
      animations: { in: { preset: 'fade', duration: 0.8, easing: 'ease-out', delay: 0.9 }, out: { preset: 'fade', duration: 0.4, easing: 'ease-in' } },
    }),
    T.Subhead, 0, 5,
  )

  // --- Scene 2: features (5–10s) ---
  const swatches = ['#9a5bf5', '#ff6a2b', '#ffb347', '#3ecfaf', '#3a8df7']
  const swatchTracks = ['Subhead', 'Accents', 'Details', 'Folder tab', 'Folder body']
  swatches.forEach((fill, i) => {
    add(
      createShapeLayer({ shape: 'ellipse', fill }, {
        name: `Swatch ${i + 1}`,
        transform: { x: 300 + i * 150, y: 640, width: 110, height: 110 },
        animations: { in: { preset: 'pop', duration: 0.5, easing: 'back-out', delay: 0.4 + i * 0.12 }, out: { preset: 'scale', duration: 0.4, easing: 'ease-in' } },
      }),
      T[swatchTracks[i]], 5, 5, { transitionIn: i === 0 ? { type: 'crossfade', duration: 0.6 } : undefined },
    )
  })
  add(
    createShapeLayer({ shape: 'rect', fill: '#ffffff', borderRadius: 32 }, {
      name: 'Card',
      transform: { x: 1040, y: 280, width: 620, height: 520 },
      animations: { in: { preset: 'slide-up', duration: 0.7, easing: 'ease-out', delay: 0.2 }, out: { preset: 'slide-down', duration: 0.5, easing: 'ease-in' } },
    }),
    T.Backdrop, 5, 5, { transitionIn: { type: 'crossfade', duration: 0.6 } },
  )
  add(
    createTextLayer({ content: 'Your brand palette', fontSize: 72, fontWeight: 800, fontFamily: 'Poppins', align: 'left', color: '#111827', lineHeight: 1.1 }, {
      name: 'Feature title',
      transform: { x: 300, y: 340, width: 640, height: 200 },
      animations: { in: { preset: 'slide-right', duration: 0.7, easing: 'ease-out' }, out: { preset: 'fade', duration: 0.4, easing: 'ease-in' } },
    }),
    T.Headline, 5, 5, { transitionIn: { type: 'crossfade', duration: 0.6 } },
  )
  add(
    createTextLayer({ content: '✓ Shared libraries\n✓ Reusable styles\n✓ One-click export', fontSize: 40, fontWeight: 500, align: 'left', color: '#374151', lineHeight: 1.6 }, {
      name: 'Feature list',
      transform: { x: 1110, y: 360, width: 500, height: 300 },
      animations: { in: { preset: 'fade', duration: 0.6, easing: 'ease-out', delay: 0.6 }, out: { preset: 'fade', duration: 0.4, easing: 'ease-in' } },
    }),
    T.Labels, 5, 5,
  )

  // --- Scene 3: outro (10–15s) ---
  add(
    createShapeLayer({ shape: 'rect', fill: '#111827', borderRadius: 0 }, {
      name: 'Dark backdrop',
      transform: { x: 0, y: 0, width: 1920, height: 1080 },
      animations: { in: { preset: 'fade', duration: 0.5, easing: 'ease-out' }, out: { preset: 'none', duration: 0.5, easing: 'ease-in' } },
    }),
    T.Backdrop, 10, 5, { transitionIn: { type: 'fade-black', duration: 0.8 } },
  )
  add(
    createShapeLayer({ shape: 'rect', fill: '#9a5bf5', borderRadius: 999 }, {
      name: 'CTA pill',
      transform: { x: 760, y: 640, width: 400, height: 110 },
      animations: { in: { preset: 'pop', duration: 0.6, easing: 'back-out', delay: 0.9 }, out: { preset: 'fade', duration: 0.6, easing: 'ease-in' } },
    }),
    T.Accents, 10, 5,
  )
  add(
    createTextLayer({ content: 'Get started free', fontSize: 40, fontWeight: 700, color: '#ffffff', align: 'center' }, {
      name: 'CTA text',
      transform: { x: 760, y: 668, width: 400, height: 54 },
      animations: { in: { preset: 'fade', duration: 0.4, easing: 'ease-out', delay: 1.1 }, out: { preset: 'fade', duration: 0.6, easing: 'ease-in' } },
    }),
    T.Labels, 10, 5,
  )
  add(
    createTextLayer({ content: APP_NAME, fontFamily: 'Space Grotesk', fontSize: 110, fontWeight: 700, color: '#ffffff', align: 'center', letterSpacing: -2 }, {
      name: 'Logo',
      transform: { x: 360, y: 380, width: 1200, height: 150 },
      animations: { in: { preset: 'scale', duration: 0.9, easing: 'back-out', delay: 0.3 }, out: { preset: 'fade', duration: 0.6, easing: 'ease-in' } },
    }),
    T.Headline, 10, 5,
  )

  project.markers = [
    { id: uid('mk'), time: 0, label: 'Intro', color: '#9a5bf5' },
    { id: uid('mk'), time: 5, label: 'Features', color: '#3a8df7' },
    { id: uid('mk'), time: 10, label: 'Outro', color: '#ff6a2b' },
  ]
  return project
}
