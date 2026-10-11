import type { Project } from '@/types'
import { createDemoProject } from '../project'
import { PALETTE, TemplateBuilder } from './helpers'
import { uid } from '@/utils/id'
import { barSeconds, trackById } from './samples'

export interface TemplateDef {
  id: string
  name: string
  description: string
  category: 'travel' | 'brand'
  aspect: '16:9' | '9:16' | '1:1'
  /** Name of the bundled music track the template uses. */
  music?: string
  duration: number
  /** Time used for the preview thumbnail. */
  previewTime: number
  build: () => Project
}

const SERIF = 'Playfair Display'
const SCRIPT = 'DM Serif Display'
const YELLOW = '#f5c518'

/** Travel diary — cream paper look with tilted polaroids and handwritten-style captions. */
function travelDiary(): Project {
  const b = new TemplateBuilder('Travel diary · polaroids', '16:9', 24, PALETTE.cream)
  b.tracks('Chips', 'Meta', 'Captions', 'Photos', 'Frames', 'Hints', 'Backdrop').audioTrack()
  const W = b.w, H = b.h
  b.text({ text: 'Our little trip', track: 'Captions', start: 0, duration: 4, x: 0, y: 380, width: W, height: 160, font: SERIF, size: 130, weight: 700, color: '#2b2622', in: { preset: 'slide-up', duration: 0.7, easing: 'ease-out' }, out: { preset: 'fade', duration: 0.4 } })
  b.text({ text: 'summer 2026', track: 'Chips', start: 0, duration: 4, x: 0, y: 560, width: W, height: 80, font: SCRIPT, size: 60, weight: 400, italic: true, color: '#8a6d5a', in: { preset: 'fade', duration: 0.7, delay: 0.5 }, out: { preset: 'fade', duration: 0.4 } })
  b.rect({ name: 'Title rule', track: 'Hints', start: 0, duration: 4, fill: '#d6b48c', x: W / 2 - 50, y: 650, width: 100, height: 6, in: { preset: 'scale', duration: 0.5, delay: 0.8 }, out: { preset: 'fade', duration: 0.3 } })
  const shots = [
    { caption: 'the morning we left', date: '12 Jun', rot: -4, color: PALETTE.sand },
    { caption: 'coffee by the harbour', date: '13 Jun', rot: 3, color: PALETTE.ocean },
    { caption: 'that hike!', date: '14 Jun', rot: -2, color: PALETTE.forest },
    { caption: 'last sunset', date: '16 Jun', rot: 4, color: PALETTE.sunset },
  ]
  shots.forEach((s, i) => {
    const start = 4 + i * 4.6
    const fw = 760, fh = 900, fx = i % 2 ? W - fw - 240 : 240, fy = Math.round((H - fh) / 2) + 20
    b.rect({ name: `Polaroid ${i + 1}`, track: 'Frames', start, duration: 4.6, fill: '#ffffff', x: fx, y: fy, width: fw, height: fh, radius: 12, rotation: s.rot, in: { preset: 'slide-up', duration: 0.6, easing: 'expo-out' }, out: { preset: i === shots.length - 1 ? 'fade' : 'slide-left', duration: 0.4 }, transition: i ? { type: 'crossfade', duration: 0.3 } : undefined })
    b.placeholder({ label: `Photo ${i + 1}`, track: 'Photos', labelTrack: 'Hints', start, duration: 4.6, color: s.color, x: fx + 50, y: fy + 50, width: fw - 100, height: fw - 100, rotation: s.rot, in: { preset: 'slide-up', duration: 0.6, easing: 'expo-out' }, out: { preset: i === shots.length - 1 ? 'fade' : 'slide-left', duration: 0.4 } })
    b.text({ text: s.caption, track: 'Captions', start, duration: 4.6, x: fx + 50, y: fy + fw - 20, width: fw - 100, height: 90, font: SCRIPT, size: 54, weight: 400, italic: true, color: '#2b2622', rotation: s.rot, in: { preset: 'fade', duration: 0.5, delay: 0.5 }, out: { preset: 'fade', duration: 0.3 } })
    const tx = i % 2 ? 200 : W - 560
    b.text({ text: s.date, track: 'Chips', start, duration: 4.6, x: tx, y: 200, width: 360, height: 100, font: 'Space Grotesk', size: 60, weight: 700, color: '#2b2622', align: i % 2 ? 'left' : 'right', in: { preset: 'slide-up', duration: 0.5, delay: 0.3 }, out: { preset: 'fade', duration: 0.3 } })
    b.text({ text: `day ${i + 1} of 5`, track: 'Meta', start, duration: 4.6, x: tx, y: 290, width: 360, height: 50, font: 'Inter', size: 30, weight: 500, color: '#8a6d5a', letterSpacing: 4, align: i % 2 ? 'left' : 'right', in: { preset: 'fade', duration: 0.5, delay: 0.5 }, out: { preset: 'fade', duration: 0.3 } })
  })
  b.text({ text: 'until next time ✈', track: 'Captions', start: 22.4, duration: 1.6, x: 0, y: H / 2 - 60, width: W, height: 120, font: SCRIPT, size: 84, weight: 400, italic: true, color: '#2b2622', in: { preset: 'fade', duration: 0.5 }, out: { preset: 'none' } })
  b.marker(0, 'Title', '#8a6d5a')
  shots.forEach((s, i) => b.marker(4 + i * 4.6, s.date, '#d6b48c'))
  b.marker(22.4, 'Outro', '#8a6d5a')
  b.music('music-golden-hour', { fromBar: 4 })
  return b.done()
}

/** Wanderlust quote — square, slow Ken Burns zoom with a quote. */
function wanderlustQuote(): Project {
  const b = new TemplateBuilder('Wanderlust quote · square', '1:1', 12, '#0b1020')
  b.tracks('Text', 'Rule', 'Author', 'Captions', 'Overlay', 'Footage').audioTrack()
  const W = b.w
  b.placeholder({ label: 'Your clip · slow landscape', track: 'Footage', labelTrack: 'Captions', start: 0, duration: 12, color: PALETTE.dusk, keyframes: [{ id: uid('kf'), property: 'scale', time: 0, value: 1, easing: 'linear' }, { id: uid('kf'), property: 'scale', time: 12, value: 1.14, easing: 'linear' }] })
  b.rect({ name: 'Dim overlay', track: 'Overlay', start: 0, duration: 12, fill: '#000000', opacity: 0.42, in: { preset: 'fade', duration: 1 } })
  b.text({ text: '“Not all those who wander are lost.”', track: 'Text', start: 0, duration: 12, x: 100, y: 380, width: W - 200, height: 300, font: SERIF, size: 78, weight: 700, lineHeight: 1.2, in: { preset: 'slide-up', duration: 0.9, easing: 'ease-out', delay: 0.6 }, out: { preset: 'fade', duration: 0.8 } })
  b.rect({ name: 'Quote rule', track: 'Rule', start: 0, duration: 12, fill: YELLOW, x: W / 2 - 40, y: 700, width: 80, height: 6, in: { preset: 'scale', duration: 0.5, delay: 1.3 }, out: { preset: 'fade', duration: 0.6 } })
  b.text({ text: '— J.R.R. Tolkien', track: 'Author', start: 0, duration: 12, x: 100, y: 730, width: W - 200, height: 60, font: SCRIPT, size: 40, weight: 400, italic: true, color: 'rgba(255,255,255,0.85)', in: { preset: 'fade', duration: 0.8, delay: 1.6 }, out: { preset: 'fade', duration: 0.8 } })
  b.marker(0, 'Quote', '#b58fb9')
  b.music('music-golden-hour', { fromBar: 52, volume: 0.7 })
  return b.done()
}

/** Vlog intro — 8 bars of Open Road (124 BPM): a wide opener, four beat cuts, then a title reveal inside a letterbox. */
const VLOG_BARS = 8
const vlogBar = () => barSeconds(trackById('music-open-road')!)
const vlogDuration = () => Math.ceil(vlogBar() * VLOG_BARS * 100) / 100
function vlogIntro(): Project {
  const B = vlogBar()
  const D = vlogDuration()
  const b = new TemplateBuilder('Vlog intro · title reveal', '16:9', D, '#0b0b10')
  b.tracks('Title', 'Subtitle', 'Chips', 'Fade', 'Rule', 'Letterbox bottom', 'Letterbox top', 'Overlay', 'Captions', 'Footage').audioTrack()
  const W = b.w, H = b.h
  // Opener, then four quick shots (two beats each), then a long backdrop for the title.
  b.shot({ label: 'Opening shot · wide landscape', start: 0, duration: B, color: PALETTE.ocean, kb: 'in', labelTrack: 'Captions' })
  const quick: Array<[string, string, 'left' | 'right' | 'up' | 'in']> = [
    ['Quick shot 1 · you walking', PALETTE.sunset, 'left'],
    ['Quick shot 2 · street or trail', PALETTE.forest, 'right'],
    ['Quick shot 3 · food or detail', PALETTE.sand, 'up'],
    ['Quick shot 4 · view', PALETTE.mountain, 'in'],
  ]
  quick.forEach(([label, color, kb], i) => {
    b.shot({ label, start: B + i * B * 0.5, duration: B * 0.5, color, kb, labelTrack: 'Captions', transition: { type: i % 2 ? 'slide-left' : 'zoom', duration: 0.25 } })
  })
  b.shot({ label: 'Title backdrop · calm wide shot', start: B * 3, duration: B * 5, color: PALETTE.dusk, kb: 'out', labelTrack: 'Captions', transition: { type: 'crossfade', duration: 0.5 } })
  b.rect({ name: 'Title dim', track: 'Overlay', start: B * 3, duration: B * 5, fill: '#000000', opacity: 0.4, in: { preset: 'fade', duration: 0.6 } })
  // Letterbox bars for the whole film.
  const bar = 110
  b.rect({ name: 'Letterbox top', track: 'Letterbox top', start: 0, duration: D, fill: '#000000', x: 0, y: 0, width: W, height: bar })
  b.rect({ name: 'Letterbox bottom', track: 'Letterbox bottom', start: 0, duration: D, fill: '#000000', x: 0, y: H - bar, width: W, height: bar })
  // Recording badge and a small location tag during the quick cuts.
  b.text({ text: '● REC', track: 'Chips', start: 0.3, duration: B * 3 - 0.5, x: 90, y: bar + 40, width: 220, height: 60, font: 'Space Grotesk', size: 34, weight: 700, color: '#ff4d4d', letterSpacing: 3, align: 'left', in: { preset: 'fade', duration: 0.3 }, out: { preset: 'fade', duration: 0.25 } })
  b.text({ text: 'YOUR DESTINATION · 2026', track: 'Subtitle', start: 0.3, duration: B * 3 - 0.5, x: W - 690, y: bar + 40, width: 600, height: 60, font: 'Space Grotesk', size: 30, weight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: 4, align: 'right', in: { preset: 'fade', duration: 0.3 }, out: { preset: 'fade', duration: 0.25 } })
  // Title reveal.
  const t0 = B * 3.4
  b.text({ text: 'EPISODE 01', track: 'Chips', start: t0, duration: B * 4.2 - 0.4, x: 0, y: 360, width: W, height: 60, font: 'Space Grotesk', size: 34, weight: 700, color: YELLOW, letterSpacing: 12, in: { preset: 'fade', duration: 0.6 }, out: { preset: 'fade', duration: 0.5 } })
  b.text({ text: 'YOUR VLOG TITLE', track: 'Title', start: t0 + 0.15, duration: B * 4.2 - 0.55, x: 0, y: 430, width: W, height: 200, font: 'Poppins', size: 150, weight: 700, letterSpacing: 4, shadow: 0.5, in: { preset: 'slide-up', duration: 0.9, easing: 'expo-out' }, out: { preset: 'fade', duration: 0.5 } })
  b.rect({ name: 'Title rule', track: 'Rule', start: t0 + 0.5, duration: B * 4.2 - 0.9, fill: YELLOW, x: W / 2 - 70, y: 650, width: 140, height: 6, in: { preset: 'scale', duration: 0.5 }, out: { preset: 'fade', duration: 0.4 } })
  b.text({ text: 'Two weeks · one backpack · no plan', track: 'Subtitle', start: t0 + 0.7, duration: B * 4.2 - 1.1, x: 0, y: 690, width: W, height: 70, font: 'Inter', size: 40, weight: 500, color: 'rgba(255,255,255,0.9)', in: { preset: 'fade', duration: 0.7 }, out: { preset: 'fade', duration: 0.5 } })
  // Fade to black at the end.
  b.rect({ name: 'Fade out', track: 'Fade', start: D - 0.9, duration: 0.9, fill: '#000000', in: { preset: 'fade', duration: 0.9 } })
  b.marker(0, 'Opener', '#b58fb9')
  b.marker(B, 'Beat cuts', '#f5a35c')
  b.marker(B * 3, 'Title', '#f5c518')
  b.music('music-open-road', { fromBar: 16, fadeIn: 0.3, fadeOut: 1.2 })
  return b.done()
}

const SHORT_TEMPLATES: TemplateDef[] = [
  { id: 'vlog-intro', music: 'Open Road', name: 'Vlog intro', description: 'Cinematic 16:9 intro on Open Road: a wide opener, four beat cuts with a REC badge, then a title reveal in a letterbox. Replace the placeholders with your clips and the title with yours.', category: 'travel', aspect: '16:9', duration: vlogDuration(), previewTime: vlogBar() * 4.2, build: vlogIntro },
  { id: 'travel-diary', music: 'Golden Hour', name: 'Travel diary', description: 'Cream paper look, tilted polaroids with handwritten captions and dates.', category: 'travel', aspect: '16:9', duration: 24, previewTime: 6.4, build: travelDiary },
  { id: 'wanderlust-quote', music: 'Golden Hour', name: 'Wanderlust quote', description: 'Slow Ken Burns zoom on your clip with an elegant quote. Square for feeds.', category: 'travel', aspect: '1:1', duration: 12, previewTime: 3.5, build: wanderlustQuote },
  { id: 'brand-launch-promo', name: 'Brand launch promo', description: 'The original demo: folder graphic, floating labels, colour swatches and a CTA.', category: 'brand', aspect: '16:9', duration: 15, previewTime: 2.2, build: createDemoProject },
]

import { ADVENTURE_TEMPLATES } from './adventure'
import { MOOD_TEMPLATES } from './moods'
import { COMPANY_TEMPLATES } from './company'

/** Long-form adventure films first, then the short reels. */
export const TEMPLATES: TemplateDef[] = [...ADVENTURE_TEMPLATES, ...MOOD_TEMPLATES, ...COMPANY_TEMPLATES, ...SHORT_TEMPLATES]
