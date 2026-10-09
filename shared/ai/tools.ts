/**
 * Claude tool definitions for Spool. Shared by the server (sent to the
 * Anthropic API) and the client (input validation before execution).
 */
import { z } from 'zod'
import { SAMPLE_TRACK_IDS, SAMPLE_TRACKS } from '../music'
import { MAX_SPEED, MIN_SPEED } from '../types'

const color = z.string().regex(/^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|transparent)$/, 'CSS color such as #4f46e5').describe('CSS color (hex like #4f46e5 or rgba())')
const easing = z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'expo-out', 'quart-out', 'sine-in-out', 'smooth', 'back-out', 'bounce'])
const preset = z.enum(['none', 'fade', 'rise', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'drift', 'scale', 'zoom-out', 'blur-in', 'wipe', 'rotate', 'pop'])
const transition = z.enum(['none', 'crossfade', 'blur-dissolve', 'fade-black', 'wipe', 'slide-left', 'slide-right', 'slide-up', 'zoom'])
const MAX_SECONDS = 300 // 5 minute composition limit
const seconds = z.number().min(0).max(MAX_SECONDS)
const id = z.string().min(1).max(64)

const animationSpec = z.object({
  preset,
  duration: z.number().min(0).max(30).optional().describe('Seconds, default 0.6'),
  easing: easing.optional(),
  delay: z.number().min(0).max(60).optional().describe('Delay after the clip start, seconds'),
})

const textStyle = z.object({
  content: z.string().max(2000).optional(),
  fontFamily: z.string().max(80).optional().describe('One of: Inter, Poppins, Space Grotesk, Playfair Display, DM Serif Display, JetBrains Mono, Georgia, Arial'),
  fontSize: z.number().min(4).max(800).optional(),
  fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).optional(),
  color: color.optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  lineHeight: z.number().min(0.5).max(4).optional(),
  letterSpacing: z.number().min(-50).max(200).optional(),
  italic: z.boolean().optional(),
  backgroundColor: color.nullable().optional().describe('Pill/background behind the text, or null for none'),
  padding: z.number().min(0).max(400).optional(),
  borderRadius: z.number().min(0).max(1000).optional(),
  shadow: z.number().min(0).max(60).optional().describe('Soft shadow blur in px so text stays readable over footage'),
})

const shapeStyle = z.object({
  shape: z.enum(['rect', 'ellipse', 'line', 'triangle']).optional(),
  fill: color.optional(),
  stroke: color.optional(),
  strokeWidth: z.number().min(0).max(200).optional(),
  borderRadius: z.number().min(0).max(1000).optional(),
  gradient: z
    .object({ to: color, angle: z.number().min(-360).max(360).optional(), type: z.enum(['linear', 'radial']).optional() })
    .nullable()
    .optional()
    .describe('Gradient from `fill` to `to` (angle 180 = top to bottom). Use rgba(0,0,0,0) → rgba(0,0,0,0.6) for a text scrim. null removes it.'),
})

const mediaStyle = z.object({
  fit: z.enum(['cover', 'contain', 'fill']).optional(),
  borderRadius: z.number().min(0).max(1000).optional(),
  volume: z.number().min(0).max(1).optional(),
  muted: z.boolean().optional(),
})

const placement = {
  x: z.number().optional().describe('Left edge in composition px'),
  y: z.number().optional().describe('Top edge in composition px'),
  width: z.number().min(1).max(20000).optional(),
  height: z.number().min(1).max(20000).optional(),
  rotation: z.number().min(-3600).max(3600).optional().describe('Degrees'),
}

const timing = {
  start: seconds.optional().describe('Timeline start in seconds (default 0)'),
  duration: z.number().min(0.1).max(MAX_SECONDS).optional().describe('Seconds on the timeline (default 5)'),
  trackId: id.optional().describe('Visual track id; a track is chosen automatically when omitted'),
}

export const toolSchemas = {
  get_project_summary: {
    description: 'Read the current project: composition, tracks, clips (with ids, timing, layer type and key properties), markers and assets. Call this first before editing.',
    schema: z.object({}),
    mutates: false,
  },
  get_selected_layer: {
    description: 'Return the clip and layer the user currently has selected (full properties), or null.',
    schema: z.object({}),
    mutates: false,
  },
  get_layer: {
    description: 'Return the full properties of one layer and its clip.',
    schema: z.object({ layerId: id }),
    mutates: false,
  },
  list_clips: {
    description: 'List timeline clips, optionally filtered by track or a time range.',
    schema: z.object({ trackId: id.optional(), from: seconds.optional(), to: seconds.optional() }),
    mutates: false,
  },
  create_text_layer: {
    description: 'Add a text layer to the canvas and a clip to the timeline. Returns the new layerId and clipId.',
    schema: z.object({
      content: z.string().min(1).max(2000),
      name: z.string().max(60).optional(),
      style: textStyle.omit({ content: true }).optional(),
      ...placement,
      ...timing,
      animationIn: animationSpec.optional(),
      animationOut: animationSpec.optional(),
    }),
    mutates: true,
  },
  create_shape_layer: {
    description: 'Add a shape (rect, ellipse, line, triangle) layer and timeline clip. Returns layerId and clipId.',
    schema: z.object({
      shape: z.enum(['rect', 'ellipse', 'line', 'triangle']),
      name: z.string().max(60).optional(),
      style: shapeStyle.omit({ shape: true }).optional(),
      ...placement,
      ...timing,
      animationIn: animationSpec.optional(),
      animationOut: animationSpec.optional(),
    }),
    mutates: true,
  },
  add_media_clip: {
    description: 'Place an uploaded image, video or audio asset (by assetId) on the timeline. Images/videos become a layer on a visual track; audio goes to an audio track.',
    schema: z.object({
      assetId: id,
      ...placement,
      ...timing,
      style: mediaStyle.optional(),
    }),
    mutates: true,
  },
  update_layer: {
    description: 'Change properties of an existing layer: name, opacity, visibility, lock, placement, and text/shape/media styling.',
    schema: z.object({
      layerId: id,
      name: z.string().max(60).optional(),
      opacity: z.number().min(0).max(1).optional(),
      hidden: z.boolean().optional(),
      locked: z.boolean().optional(),
      ...placement,
      text: textStyle.optional().describe('Only for text layers'),
      shape: shapeStyle.optional().describe('Only for shape layers'),
      media: mediaStyle.optional().describe('Only for image/video layers'),
    }),
    mutates: true,
  },
  move_clip: {
    description: 'Move a clip to a new start time and optionally another compatible track.',
    schema: z.object({ clipId: id, start: seconds, trackId: id.optional() }),
    mutates: true,
  },
  trim_clip: {
    description: 'Trim the start or end edge of a clip to an absolute timeline time.',
    schema: z.object({ clipId: id, edge: z.enum(['start', 'end']), time: seconds }),
    mutates: true,
  },
  set_clip_duration: {
    description: 'Set how long a clip stays on screen (keeps its start).',
    schema: z.object({ clipId: id, duration: z.number().min(0.1).max(MAX_SECONDS) }),
    mutates: true,
  },
  split_clip: {
    description: 'Split a clip into two at an absolute time. Returns the new right-hand clipId.',
    schema: z.object({ clipId: id, time: seconds }),
    mutates: true,
  },
  delete_clips: {
    description: 'Delete clips (and their layers) by id.',
    schema: z.object({ clipIds: z.array(id).min(1).max(100) }),
    mutates: true,
  },
  set_animation: {
    description: "Set a layer's entrance ('in') or exit ('out') animation preset, duration, easing and delay.",
    schema: z.object({ layerId: id, which: z.enum(['in', 'out']), ...animationSpec.shape }),
    mutates: true,
  },
  add_keyframe: {
    description: 'Add a keyframe for x, y, width, height, rotation, opacity or scale at a time relative to the clip start. Two or more keyframes on a property animate it.',
    schema: z.object({
      layerId: id,
      property: z.enum(['x', 'y', 'width', 'height', 'rotation', 'opacity', 'scale']),
      time: z.number().min(0).max(MAX_SECONDS).describe('Seconds after the clip start'),
      value: z.number(),
      easing: easing.optional(),
    }),
    mutates: true,
  },
  clear_keyframes: {
    description: 'Remove keyframes from a layer (all, or one property).',
    schema: z.object({ layerId: id, property: z.enum(['x', 'y', 'width', 'height', 'rotation', 'opacity', 'scale']).optional() }),
    mutates: true,
  },
  apply_transition: {
    description: 'Apply a transition between a clip and the previous clip on the same track (set on the later clip).',
    schema: z.object({ clipId: id, type: transition, duration: z.number().min(0).max(10).optional().describe('Seconds, default 0.6') }),
    mutates: true,
  },
  update_composition: {
    description: 'Change composition settings: aspect ratio (rescales all layers), total duration, fps, background color.',
    schema: z.object({
      aspect: z.enum(['16:9', '9:16', '1:1', '4:5', '4:3']).optional(),
      duration: z.number().min(1).max(MAX_SECONDS).optional().describe('Total length in seconds, up to 300 (5 minutes)'),
      fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(50), z.literal(60)]).optional(),
      backgroundColor: color.optional(),
    }),
    mutates: true,
  },
  update_audio: {
    description: 'Change volume, fades and mute on an audio clip.',
    schema: z.object({
      clipId: id,
      volume: z.number().min(0).max(1).optional(),
      fadeIn: z.number().min(0).max(60).optional(),
      fadeOut: z.number().min(0).max(60).optional(),
      muted: z.boolean().optional(),
    }),
    mutates: true,
  },
  add_marker: {
    description: 'Add a section marker to the timeline ruler.',
    schema: z.object({ time: seconds, label: z.string().min(1).max(40), color: color.optional() }),
    mutates: true,
  },
  set_speed: {
    description: `Speed up or slow down playback and the exported video. target "video" changes the whole video; target "section" changes one section, which runs from its marker to the next marker (give markerId, or sectionLabel to match a marker's label). Speed is a multiplier from ${MIN_SPEED} to ${MAX_SPEED}: 2 is twice as fast, 0.5 is half speed, 1 is normal. Whole-video and section speeds multiply. Add markers first to make a section, then set its speed.`,
    schema: z.object({
      target: z.enum(['video', 'section']),
      speed: z.number().min(MIN_SPEED).max(MAX_SPEED),
      markerId: z.string().min(1).max(80).optional(),
      sectionLabel: z.string().min(1).max(40).optional().describe('Case-insensitive marker label, used when markerId is not given'),
    }),
    mutates: true,
  },
  align_layers: {
    description: 'Align layers to the composition edges or centre.',
    schema: z.object({ layerIds: z.array(id).min(1).max(100), mode: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']) }),
    mutates: true,
  },
  set_layer_order: {
    description: 'Change the stacking order of a visual clip (forward/backward/front/back).',
    schema: z.object({ clipId: id, direction: z.enum(['forward', 'backward', 'front', 'back']) }),
    mutates: true,
  },
  add_sample_music: {
    description: `Add one of the bundled royalty-free music tracks to the project on an audio track. Returns the audio clipId. Tracks: ${SAMPLE_TRACKS.map((t) => `${t.id} (${t.bpm} BPM, ${t.mood}${t.duration < 60 ? ', ' + t.duration + ' s loop' : ''})`).join('; ')}. Full tracks are 240 s; use fromSeconds to start inside the track (e.g. at the chorus).`,
    schema: z.object({
      trackId: z.enum(SAMPLE_TRACK_IDS),
      start: seconds.optional().describe('Timeline start in seconds (default 0)'),
      duration: z.number().min(0.5).max(MAX_SECONDS).optional().describe('Seconds to play (default: the whole track, capped to the composition)'),
      fromSeconds: z.number().min(0).max(MAX_SECONDS).optional().describe('Offset into the track to start from'),
      volume: z.number().min(0).max(1).optional(),
      fadeIn: z.number().min(0).max(60).optional(),
      fadeOut: z.number().min(0).max(60).optional(),
    }),
    mutates: true,
  },
  request_preview_update: {
    description: 'Move the playhead so the user previews a specific moment of the result.',
    schema: z.object({ time: seconds }),
    mutates: false,
  },
} as const

export type ToolName = keyof typeof toolSchemas
export const toolNames = Object.keys(toolSchemas) as ToolName[]

export function isToolName(name: string): name is ToolName {
  return name in toolSchemas
}

/** Validate a tool input. Returns the parsed value or throws a ZodError. */
export function parseToolInput<N extends ToolName>(name: N, input: unknown): z.infer<(typeof toolSchemas)[N]['schema']> {
  return toolSchemas[name].schema.parse(input) as z.infer<(typeof toolSchemas)[N]['schema']>
}

/** Convert to Anthropic tool definitions (JSON Schema). */
export function toolDefinitions() {
  return toolNames.map((name) => {
    const { $schema: _omit, ...schema } = z.toJSONSchema(toolSchemas[name].schema, { target: 'draft-7', io: 'input' }) as { $schema?: string; type: 'object'; [k: string]: unknown }
    void _omit
    return { name, description: toolSchemas[name].description, input_schema: schema }
  })
}
