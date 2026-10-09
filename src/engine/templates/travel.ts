import type { Project } from '@/types'
import { createDemoProject } from '../project'
import { MONTAGE_COLORS, PALETTE, TemplateBuilder, buildUpLines, type KenBurns } from './helpers'
import { trackById } from './samples'
import { uid } from '@/utils/id'

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
const SANS = 'Poppins'
const YELLOW = '#f5c518'

/** Reel 1 — vertical season recap: opener, hero shot with a word-by-word title, "Goodnight", beat-cut montage. */
function seasonRecapVertical(): Project {
  const b = new TemplateBuilder('Season recap · Reels', '9:16', 27, '#0b1020')
  b.tracks('Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6', 'Line 7', 'Captions', 'Footage').audioTrack()
  const W = b.w

  b.placeholder({ label: 'Opening clip · a calm wide shot', track: 'Footage', labelTrack: 'Captions', start: 0, duration: 3, color: PALETTE.sunset, out: { preset: 'none' } })
  b.text({ text: 'SUMMER 2026', track: 'Line 7', start: 0.3, duration: 2.7, x: 90, y: 160, width: W - 180, height: 60, font: 'Inter', size: 34, weight: 600, letterSpacing: 10, in: { preset: 'fade', duration: 0.6 }, out: { preset: 'fade', duration: 0.3 } })

  b.placeholder({ label: 'Hero clip · you in the landscape', track: 'Footage', labelTrack: 'Captions', start: 3, duration: 10.5, color: PALETTE.mountain, transition: { type: 'crossfade', duration: 0.6 }, keyframes: [{ id: uid('kf'), property: 'scale', time: 0, value: 1, easing: 'linear' }, { id: uid('kf'), property: 'scale', time: 10.5, value: 1.1, easing: 'linear' }] })
  buildUpLines(b, [
    { text: 'And', track: 'Line 1', font: SCRIPT, size: 110, weight: 400, italic: true },
    { text: 'WITH', track: 'Line 2', font: SERIF, size: 170, weight: 700, letterSpacing: 4 },
    { text: 'that', track: 'Line 3', font: SCRIPT, size: 110, weight: 400, italic: true },
    { text: 'The', track: 'Line 4', font: SERIF, size: 120, weight: 400 },
    { text: '2026', track: 'Line 5', font: SANS, size: 210, weight: 800, color: YELLOW },
    { text: 'SEASON', track: 'Line 6', font: SERIF, size: 150, weight: 700, letterSpacing: 6 },
    { text: 'comes to an End', track: 'Line 7', font: SCRIPT, size: 84, weight: 400, italic: true },
  ], { start: 3, duration: 8.4, y: 470, gap: -10, stagger: 0.5, firstDelay: 0.5 })

  b.text({ text: 'GOODNIGHT', track: 'Line 5', start: 11.4, duration: 2.1, x: 60, y: 880, width: W - 120, height: 170, font: SANS, size: 150, weight: 800, color: YELLOW, letterSpacing: -2, in: { preset: 'pop', duration: 0.45, easing: 'expo-out' }, out: { preset: 'fade', duration: 0.3 } })

  b.montage({ track: 'Footage', labelTrack: 'Captions', start: 13.5, count: 13, each: 1, labelPrefix: 'Moment', transitions: ['slide-left', 'zoom', 'crossfade', 'slide-up'], transitionDuration: 0.3, zoom: true })
  b.text({ text: 'see you next season ✈', track: 'Line 6', start: 24.5, duration: 2.5, x: 90, y: 1620, width: W - 180, height: 90, font: SCRIPT, size: 64, weight: 400, italic: true, in: { preset: 'fade', duration: 0.6 }, out: { preset: 'fade', duration: 0.5 } })

  b.marker(0, 'Opening', '#e7a07a').marker(3, 'Title build-up', '#9aa5c4').marker(11.4, 'Goodnight', YELLOW).marker(13.5, 'Montage', '#7fb7c9').marker(24.5, 'Outro', '#b58fb9')
  b.music('music-trailhead', { fromBar: 26 })
  return b.done()
}

/** Reel 2 — landscape "Life in 2026" recap with a white title card, hero build-up, montage with photo collages. */
function lifeIn2026(): Project {
  const b = new TemplateBuilder('Life in 2026 · recap', '16:9', 27, '#0b1020')
  b.tracks('Titles', 'Left 1', 'Left 2', 'Left 3', 'Mid', 'Right 1', 'Right 2', 'Right 3', 'Captions', 'Collage 1', 'Collage 2', 'Collage 3', 'Footage').audioTrack()
  const W = b.w, H = b.h

  // White title card
  b.rect({ name: 'White card', track: 'Footage', start: 0, duration: 3.2, fill: '#ffffff', out: { preset: 'fade', duration: 0.3 } })
  b.text({ text: 'Life', track: 'Titles', start: 0, duration: 1.3, x: 0, y: H / 2 - 110, width: W, height: 220, font: SANS, size: 170, weight: 800, color: '#111111', in: { preset: 'fade', duration: 0.25 }, out: { preset: 'none' } })
  b.text({ text: 'Life In 2026', track: 'Titles', start: 1.3, duration: 1.9, x: 0, y: H / 2 - 110, width: W, height: 220, font: SANS, size: 170, weight: 800, color: '#111111', in: { preset: 'none' }, out: { preset: 'fade', duration: 0.3 } })

  // Hero with the build-up title
  b.placeholder({ label: 'Hero clip · your favourite landscape', track: 'Footage', labelTrack: 'Captions', start: 3.2, duration: 7.8, color: PALETTE.mountain, transition: { type: 'crossfade', duration: 0.5 }, keyframes: [{ id: uid('kf'), property: 'scale', time: 0, value: 1.04, easing: 'linear' }, { id: uid('kf'), property: 'scale', time: 7.8, value: 1.12, easing: 'linear' }] })
  buildUpLines(b, [
    { text: 'AND', track: 'Left 1', font: SANS, size: 92, weight: 700, align: 'left', x: 140, width: 500 },
    { text: 'WITH', track: 'Left 2', font: SANS, size: 92, weight: 700, align: 'left', x: 140, width: 500 },
    { text: 'THAT', track: 'Left 3', font: SANS, size: 92, weight: 700, align: 'left', x: 140, width: 500 },
  ], { start: 3.2, duration: 7.8, y: 330, gap: -14, stagger: 0.35, firstDelay: 0.4 })
  b.text({ text: 'The 2026', track: 'Titles', start: 3.2, duration: 7.8, x: 600, y: 300, width: 760, height: 200, font: SCRIPT, size: 170, weight: 400, italic: true, in: { preset: 'slide-up', duration: 0.5, delay: 1.5 }, out: { preset: 'fade', duration: 0.5 } })
  b.text({ text: 'season', track: 'Mid', start: 3.2, duration: 7.8, x: 600, y: 500, width: 760, height: 90, font: SCRIPT, size: 70, weight: 400, italic: true, in: { preset: 'fade', duration: 0.4, delay: 1.9 }, out: { preset: 'fade', duration: 0.5 } })
  buildUpLines(b, [
    { text: 'COMES', track: 'Right 1', font: SANS, size: 64, weight: 700, align: 'left', x: 1400, width: 420 },
    { text: 'TO AN', track: 'Right 2', font: SANS, size: 64, weight: 700, align: 'left', x: 1400, width: 420 },
    { text: 'END', track: 'Right 3', font: SANS, size: 64, weight: 700, align: 'left', x: 1400, width: 420 },
  ], { start: 3.2, duration: 7.8, y: 330, gap: -8, stagger: 0.3, firstDelay: 2.4 })

  // Montage with two collage moments
  let t = b.montage({ track: 'Footage', labelTrack: 'Captions', start: 11, count: 4, each: 1.1, labelPrefix: 'Moment', transitions: ['slide-left', 'crossfade', 'zoom'], zoom: true })
  const collage = (start: number, dur: number, n: number) => {
    const gap = 40, cw = Math.round((W - gap * 4) / 3), ch = Math.round(H * 0.58), y = Math.round((H - ch) / 2)
    b.rect({ name: `Collage ${n} backdrop`, track: 'Footage', start, duration: dur, fill: '#0b1020', transition: { type: 'crossfade', duration: 0.3 } })
    ;['Collage 1', 'Collage 2', 'Collage 3'].forEach((track, i) => {
      b.placeholder({ label: `Photo ${n}.${i + 1}`, track, start, duration: dur, color: [PALETTE.lagoon, PALETTE.sand, PALETTE.clay][i], x: gap + i * (cw + gap), y, width: cw, height: ch, radius: 24, silent: true, in: { preset: 'slide-up', duration: 0.4, easing: 'expo-out', delay: i * 0.12 } })
    })
  }
  collage(t, 1.6, 1); t += 1.6
  t = b.montage({ track: 'Footage', labelTrack: 'Captions', start: t, count: 3, each: 1.1, labelPrefix: 'Moment', transitions: ['zoom', 'slide-up', 'crossfade'], zoom: true })
  collage(t, 1.6, 2); t += 1.6
  t = b.montage({ track: 'Footage', labelTrack: 'Captions', start: t, count: 2, each: 1.1, labelPrefix: 'Moment', transitions: ['slide-left', 'crossfade'], zoom: true })
  b.placeholder({ label: 'Closing clip · sunset', track: 'Footage', labelTrack: 'Captions', start: t, duration: 27 - t, color: PALETTE.sunset, transition: { type: 'crossfade', duration: 0.6 } })
  b.text({ text: 'thank you, 2026', track: 'Titles', start: t + 0.3, duration: 27 - t - 0.3, x: 0, y: H - 260, width: W, height: 100, font: SCRIPT, size: 72, weight: 400, italic: true, in: { preset: 'fade', duration: 0.6 }, out: { preset: 'fade', duration: 0.5 } })

  b.marker(0, 'Title card', '#111111').marker(3.2, 'Hero', '#9aa5c4').marker(11, 'Montage', '#7fb7c9').marker(t, 'Outro', '#e7a07a')
  b.music('music-trailhead', { fromBar: 27 })
  return b.done()
}

/** Destination highlights — a city/country intro and three "Day" scenes. */
function destinationHighlights(): Project {
  const b = new TemplateBuilder('Destination highlights · Reels', '9:16', 20, '#0b1020')
  b.tracks('Chips', 'Titles', 'Subtitles', 'Lines', 'Captions', 'Footage').audioTrack()
  const W = b.w
  b.placeholder({ label: 'Intro clip · drone or skyline', track: 'Footage', labelTrack: 'Captions', start: 0, duration: 4, color: PALETTE.ocean, keyframes: [{ id: uid('kf'), property: 'scale', time: 0, value: 1, easing: 'linear' }, { id: uid('kf'), property: 'scale', time: 4, value: 1.08, easing: 'linear' }] })
  b.rect({ name: 'Intro dim', track: 'Lines', start: 0, duration: 4, fill: '#000000', opacity: 0.28 })
  b.text({ text: 'BALI', track: 'Titles', start: 0, duration: 4, x: 60, y: 720, width: W - 120, height: 260, font: 'Space Grotesk', size: 230, weight: 700, letterSpacing: -4, in: { preset: 'slide-up', duration: 0.7, easing: 'ease-out', delay: 0.2 }, out: { preset: 'fade', duration: 0.4 } })
  b.rect({ name: 'Intro rule', track: 'Subtitles', start: 0, duration: 4, fill: YELLOW, x: W / 2 - 60, y: 1000, width: 120, height: 8, in: { preset: 'scale', duration: 0.5, delay: 0.7 }, out: { preset: 'fade', duration: 0.3 } })
  b.text({ text: 'INDONESIA  ·  7 DAYS', track: 'Chips', start: 0, duration: 4, x: 60, y: 1040, width: W - 120, height: 60, font: 'Inter', size: 36, weight: 600, letterSpacing: 8, in: { preset: 'fade', duration: 0.6, delay: 0.9 }, out: { preset: 'fade', duration: 0.3 } })

  const days = [
    { day: 'DAY 1', title: 'Ubud rice terraces', note: 'Tegallalang · early morning', color: PALETTE.forest },
    { day: 'DAY 2', title: 'Uluwatu cliffs', note: 'Sunset at the temple', color: PALETTE.sunset },
    { day: 'DAY 3', title: 'Nusa Penida', note: 'Kelingking beach', color: PALETTE.lagoon },
  ]
  days.forEach((d, i) => {
    const start = 4 + i * 4.7
    b.placeholder({ label: `${d.day} clip`, track: 'Footage', labelTrack: 'Captions', start, duration: 4.7, color: d.color, transition: { type: i % 2 ? 'zoom' : 'slide-left', duration: 0.45 }, keyframes: [{ id: uid('kf'), property: 'scale', time: 0, value: 1.08, easing: 'linear' }, { id: uid('kf'), property: 'scale', time: 4.7, value: 1, easing: 'linear' }] })
    b.text({ text: d.day, track: 'Chips', start, duration: 4.7, x: 70, y: 150, width: 230, height: 64, font: 'Inter', size: 30, weight: 700, letterSpacing: 4, color: '#111111', pill: YELLOW, padding: 12, radius: 999, in: { preset: 'slide-right', duration: 0.5, easing: 'expo-out', delay: 0.2 }, out: { preset: 'fade', duration: 0.3 } })
    b.text({ text: d.title, track: 'Titles', start, duration: 4.7, x: 70, y: 1480, width: W - 140, height: 110, font: SERIF, size: 82, weight: 700, align: 'left', lineHeight: 1.05, in: { preset: 'slide-up', duration: 0.6, delay: 0.3 }, out: { preset: 'fade', duration: 0.3 } })
    b.text({ text: d.note, track: 'Subtitles', start, duration: 4.7, x: 70, y: 1600, width: W - 140, height: 50, font: 'Inter', size: 34, weight: 400, align: 'left', color: 'rgba(255,255,255,0.85)', in: { preset: 'fade', duration: 0.6, delay: 0.6 }, out: { preset: 'fade', duration: 0.3 } })
    b.rect({ name: `${d.day} rule`, track: 'Lines', start, duration: 4.7, fill: YELLOW, x: 70, y: 1455, width: 90, height: 6, in: { preset: 'slide-right', duration: 0.5, delay: 0.25 }, out: { preset: 'fade', duration: 0.3 } })
  })

  b.rect({ name: 'End card', track: 'Footage', start: 18.1, duration: 1.9, fill: '#0b1020', transition: { type: 'fade-black', duration: 0.5 } })
  b.text({ text: 'Plan your escape', track: 'Titles', start: 18.1, duration: 1.9, x: 60, y: 820, width: W - 120, height: 120, font: SERIF, size: 90, weight: 700, in: { preset: 'scale', duration: 0.5, easing: 'expo-out', delay: 0.2 }, out: { preset: 'none' } })
  b.text({ text: '@yourhandle', track: 'Chips', start: 18.1, duration: 1.9, x: W / 2 - 220, y: 980, width: 440, height: 70, font: 'Inter', size: 34, weight: 600, color: '#111111', pill: YELLOW, padding: 14, radius: 999, in: { preset: 'pop', duration: 0.4, easing: 'expo-out', delay: 0.5 }, out: { preset: 'none' } })
  b.marker(0, 'Intro', '#7fb7c9').marker(4, 'Day 1', '#8fbf9f').marker(8.7, 'Day 2', '#e7a07a').marker(13.4, 'Day 3', '#79c7b7').marker(18.1, 'End card', YELLOW)
  b.music('music-open-road', { fromBar: 12 })
  return b.done()
}

/** Top 5 places — countdown with big numbers. */
function topFivePlaces(): Project {
  const b = new TemplateBuilder('Top 5 places · Reels', '9:16', 25, '#111111')
  b.tracks('Numbers', 'Titles', 'Subtitles', 'Captions', 'Footage').audioTrack()
  const W = b.w, H = b.h
  b.rect({ name: 'Intro backdrop', track: 'Footage', start: 0, duration: 3, fill: '#111111' })
  b.text({ text: 'TOP 5', track: 'Numbers', start: 0, duration: 3, x: 60, y: 700, width: W - 120, height: 260, font: 'Space Grotesk', size: 240, weight: 700, color: '#ff6a2b', letterSpacing: -6, in: { preset: 'pop', duration: 0.5, easing: 'expo-out' }, out: { preset: 'fade', duration: 0.3 } })
  b.text({ text: 'places to visit in Japan', track: 'Titles', start: 0, duration: 3, x: 60, y: 970, width: W - 120, height: 90, font: SERIF, size: 64, weight: 400, in: { preset: 'slide-up', duration: 0.5, delay: 0.4 }, out: { preset: 'fade', duration: 0.3 } })
  const places = [
    { name: 'Hakone', note: 'Lake Ashi · Mount Fuji views', color: PALETTE.mountain },
    { name: 'Nara', note: 'Deer park & Tōdai-ji', color: PALETTE.forest },
    { name: 'Osaka', note: 'Dōtonbori at night', color: PALETTE.dusk },
    { name: 'Tokyo', note: 'Shibuya crossing', color: PALETTE.ocean },
    { name: 'Kyoto', note: 'Fushimi Inari at dawn', color: PALETTE.sunset },
  ]
  places.forEach((pl, i) => {
    const start = 3 + i * 4
    const n = 5 - i
    b.placeholder({ label: `#${n} ${pl.name} clip`, track: 'Footage', labelTrack: 'Captions', start, duration: 4, color: pl.color, transition: { type: i % 2 ? 'slide-up' : 'slide-left', duration: 0.4 }, keyframes: [{ id: uid('kf'), property: 'scale', time: 0, value: 1, easing: 'linear' }, { id: uid('kf'), property: 'scale', time: 4, value: 1.1, easing: 'linear' }] })
    b.text({ text: String(n), track: 'Numbers', start, duration: 4, x: 40, y: H - 760, width: 420, height: 460, font: SANS, size: 420, weight: 800, color: '#ff6a2b', align: 'left', lineHeight: 1, in: { preset: 'slide-up', duration: 0.5, easing: 'expo-out' }, out: { preset: 'slide-down', duration: 0.3 } })
    b.text({ text: pl.name, track: 'Titles', start, duration: 4, x: 70, y: H - 330, width: W - 140, height: 110, font: 'Space Grotesk', size: 92, weight: 700, align: 'left', in: { preset: 'slide-up', duration: 0.5, delay: 0.25 }, out: { preset: 'fade', duration: 0.3 } })
    b.text({ text: pl.note, track: 'Subtitles', start, duration: 4, x: 70, y: H - 215, width: W - 140, height: 50, font: 'Inter', size: 34, weight: 400, align: 'left', color: 'rgba(255,255,255,0.85)', in: { preset: 'fade', duration: 0.5, delay: 0.5 }, out: { preset: 'fade', duration: 0.3 } })
  })
  b.rect({ name: 'Outro backdrop', track: 'Footage', start: 23, duration: 2, fill: '#111111', transition: { type: 'fade-black', duration: 0.5 } })
  b.text({ text: 'Which one is your favourite?', track: 'Titles', start: 23, duration: 2, x: 80, y: 860, width: W - 160, height: 200, font: SERIF, size: 76, weight: 700, lineHeight: 1.15, in: { preset: 'fade', duration: 0.5, delay: 0.2 }, out: { preset: 'none' } })
  b.marker(0, 'Intro', '#ff6a2b')
  places.forEach((pl, i) => b.marker(3 + i * 4, `#${5 - i} ${pl.name}`, '#9aa5c4'))
  b.marker(23, 'Outro', '#ff6a2b')
  b.music('music-open-road', { fromBar: 16 })
  return b.done()
}

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

/** Music montage — 16 bars of Trailhead (112 BPM): a build for the title, then a cut on every second beat once the chorus lands. */
function musicMontage(): Project {
  const track = trackById('music-trailhead')!
  const beat = 60 / track.bpm
  const bar = beat * 4
  const bars = 16
  const duration = Math.round(bar * bars * 100) / 100
  const b = new TemplateBuilder('Music montage · beat-synced', '9:16', duration, '#0b1020')
  b.tracks('Counter', 'Titles', 'Captions', 'Footage').audioTrack(`Music · ${track.name}`)
  const W = b.w, H = b.h

  // Bars 1–8: the build — title over a slow push-in
  b.shot({ label: 'Opening clip', start: 0, duration: bar * 8, color: PALETTE.sunset, kb: 'in', track: 'Footage', labelTrack: 'Captions' })
  b.text({ text: 'ON THE ROAD', track: 'Titles', start: 0, duration: bar * 8, x: 60, y: 760, width: W - 120, height: 150, font: 'Space Grotesk', size: 124, weight: 700, letterSpacing: -2, in: { preset: 'blur-in', duration: 1.6, easing: 'quart-out', delay: bar * 0.5 }, out: { preset: 'fade', duration: beat * 2 } })
  b.text({ text: `${track.bpm} BPM · the cuts land on the beat`, track: 'Counter', start: 0, duration: bar * 8, x: 60, y: 920, width: W - 120, height: 50, font: 'Inter', size: 32, weight: 500, letterSpacing: 4, color: 'rgba(255,255,255,0.85)', in: { preset: 'rise', duration: 1, delay: bar * 1.5 }, out: { preset: 'fade', duration: beat * 2 } })

  // Bars 9–16: the chorus — a new shot every second beat
  const montageStart = bar * 8
  const count = 16
  const kbs: KenBurns[] = ['in', 'left', 'out', 'right']
  for (let i = 0; i < count; i++) {
    b.shot({
      label: `Beat ${String(i + 1).padStart(2, '0')}`, start: montageStart + i * beat * 2, duration: beat * 2, color: MONTAGE_COLORS[i % MONTAGE_COLORS.length], kb: kbs[i % 4], track: 'Footage', labelTrack: 'Captions',
      transition: i === 0 ? { type: 'blur-dissolve', duration: beat } : { type: (['slide-left', 'zoom', 'wipe', 'crossfade'] as const)[(i - 1) % 4], duration: beat / 2 },
    })
    b.text({ text: String(i + 1).padStart(2, '0'), track: 'Counter', start: montageStart + i * beat * 2, duration: beat * 2, x: W - 300, y: 120, width: 220, height: 110, font: 'Space Grotesk', size: 96, weight: 700, align: 'right', color: YELLOW, shadow: 12, in: { preset: 'rise', duration: beat, easing: 'expo-out' }, out: { preset: 'none' } })
  }
  b.marker(0, 'Build', '#e7a07a').marker(montageStart, 'Chorus · cuts on the beat', '#3a8df7')
  for (let i = 1; i < bars; i++) if (i !== 8) b.marker(i * bar, `Bar ${i + 1}`, '#a3a7b3')
  void H
  b.music('music-trailhead', { fromBar: 24, fadeOut: bar * 2 })
  return b.done()
}

const SHORT_TEMPLATES: TemplateDef[] = [
  { id: 'music-montage', music: 'Trailhead', name: 'Music montage', description: 'Beat-synced cuts on the bundled 112 BPM Trailhead track: a build, then a new shot on every second beat with a counter. Swap in your own song from Project → Media.', category: 'travel', aspect: '9:16', duration: 34.29, previewTime: 4, build: musicMontage },
  { id: 'season-recap-reels', music: 'Trailhead', name: 'Season recap', description: 'Opener, hero shot with a word-by-word title, “Goodnight”, then a beat-cut montage. Inspired by the vertical recap reel.', category: 'travel', aspect: '9:16', duration: 27, previewTime: 7.2, build: seasonRecapVertical },
  { id: 'life-in-2026', music: 'Trailhead', name: 'Life in 2026', description: 'White title card, “And with that the 2026 season comes to an end”, montage with photo collages. Inspired by the landscape recap reel.', category: 'travel', aspect: '16:9', duration: 27, previewTime: 7.2, build: lifeIn2026 },
  { id: 'destination-highlights', music: 'Open Road', name: 'Destination highlights', description: 'Big destination intro, three “Day” scenes with chips and captions, end card with your handle.', category: 'travel', aspect: '9:16', duration: 20, previewTime: 5.8, build: destinationHighlights },
  { id: 'top-5-places', music: 'Open Road', name: 'Top 5 places', description: 'Countdown with oversized numbers, place names and notes over your clips.', category: 'travel', aspect: '9:16', duration: 25, previewTime: 4.5, build: topFivePlaces },
  { id: 'travel-diary', music: 'Golden Hour', name: 'Travel diary', description: 'Cream paper look, tilted polaroids with handwritten captions and dates.', category: 'travel', aspect: '16:9', duration: 24, previewTime: 6.4, build: travelDiary },
  { id: 'wanderlust-quote', music: 'Golden Hour', name: 'Wanderlust quote', description: 'Slow Ken Burns zoom on your clip with an elegant quote. Square for feeds.', category: 'travel', aspect: '1:1', duration: 12, previewTime: 3.5, build: wanderlustQuote },
  { id: 'brand-launch-promo', name: 'Brand launch promo', description: 'The original demo: folder graphic, floating labels, colour swatches and a CTA.', category: 'brand', aspect: '16:9', duration: 15, previewTime: 2.2, build: createDemoProject },
]

import { ADVENTURE_TEMPLATES } from './adventure'
import { MOOD_TEMPLATES } from './moods'
import { MIX_TEMPLATES } from './mixes'
import { GROUP_TEMPLATES } from './grouptrip'

/** Long-form adventure films first, then the short reels. */
export const TEMPLATES: TemplateDef[] = [...ADVENTURE_TEMPLATES, ...GROUP_TEMPLATES, ...MIX_TEMPLATES, ...MOOD_TEMPLATES, ...SHORT_TEMPLATES]
