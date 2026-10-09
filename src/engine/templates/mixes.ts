/**
 * Multi-song 16:9 templates. Each section of the film is cut to its own song (its own tempo), and the
 * songs crossfade on two overlapping audio tracks, so the music changes with the mood of the scene.
 * Every section is storyboarded in whole bars of its song, so cuts still land on the beat.
 */
import type { Project } from '@/types'
import type { TemplateDef } from './travel'
import { TemplateBuilder } from './helpers'
import {
  bigStatement, bigWord, caption, chapterCard, dayChip, endCard, Film, lowerThird, polaroid, progress, quote, shot, shots, stats, titleCard, triptych, vignette,
  type Style,
} from './scenes'
import { barSeconds, trackById } from './samples'

const MIX: Style = { heading: 'Poppins', script: 'DM Serif Display', sans: 'Plus Jakarta Sans', accent: '#9a5bf5', ink: '#ffffff', mute: 'rgba(255,255,255,0.84)', dark: '#14111f', tones: ['#6aa7b0', '#d98c5f', '#7a92c9', '#3ecfaf', '#e0508a', '#c9b06a'] }
export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

export interface Part { track: string; fromBar: number; bars: number; /** Music volume 0..1 (default 0.9); lower it under talking. */ volume?: number }
export interface Planned extends Part { start: number; d: number; bar: number; bpm: number; name: string; mood: string }

/** Lay the parts end to end; each part keeps the tempo of its own song. */
export function plan(parts: Part[]): Planned[] {
  let t = 0
  return parts.map((p) => {
    const tr = trackById(p.track)!
    const bar = barSeconds(tr)
    const d = p.bars * bar
    const r = { ...p, start: t, d, bar, bpm: tr.bpm, name: tr.name, mood: tr.mood }
    t += d
    return r
  })
}
export const totalOf = (pl: Planned[]) => Math.ceil((pl[pl.length - 1].start + pl[pl.length - 1].d) * 100 - 1e-6) / 100

/** A film positioned at the start of part `i`, running at that part's tempo. */
export const filmAt = (b: TemplateBuilder, pl: Planned[], i: number, style: Style = MIX) => new Film(b, style, pl[i].bpm, pl[i].start)

export function expectEnd(F: Film, p: Planned, name: string) {
  if (Math.abs(F.time - (p.start + p.d)) > 1e-6) throw new Error(`${name}: part "${p.name}" ends at ${F.time}, expected ${p.start + p.d}`)
}

/**
 * Put every part's song on one of two audio tracks (alternating), starting `xf` seconds early so the
 * previous song fades out under the next one's fade-in. Each song's trim keeps its bar line on the scene cut.
 */
export function mixMusic(b: TemplateBuilder, pl: Planned[], o: { xf?: number; fadeOut?: number } = {}) {
  b.audioTrack('Music A')
  b.audioTrack('Music B')
  const lead = pl.map((p, i) => (i === 0 ? 0 : Math.min(o.xf ?? 2.4, p.fromBar * p.bar)))
  pl.forEach((p, i) => {
    const start = p.start - lead[i]
    const end = p.start + p.d
    b.music(p.track, {
      track: i % 2 ? 'Music B' : 'Music A', start, duration: end - start, fromSeconds: p.fromBar * p.bar - lead[i],
      volume: p.volume, fadeIn: i === 0 ? 1.5 : lead[i], fadeOut: i === pl.length - 1 ? o.fadeOut ?? 4 : lead[i + 1],
    })
  })
}

const musicNames = (parts: Part[]) => parts.map((p) => trackById(p.track)!.name).join(' + ')

// =============================================================================================
// 1. Journey in four moods — Drift → Trailhead → Boom Bap → Good Vibes
// =============================================================================================
const JOURNEY: Part[] = [
  { track: 'music-drift', fromBar: 0, bars: 12 },
  { track: 'music-trailhead', fromBar: 24, bars: 24 },
  { track: 'music-boom-bap', fromBar: 36, bars: 24 },
  { track: 'music-good-vibes', fromBar: 84, bars: 16 },
]
function journeyFourMoods(): Project {
  const pl = plan(JOURNEY)
  const dur = totalOf(pl)
  const b = new TemplateBuilder(`Journey in four moods · ${fmt(dur)}`, '16:9', dur, MIX.dark)
  vignette(filmAt(b, pl, 0), dur, 0.3)
  progress(filmAt(b, pl, 0), dur)

  // Chill · Drift
  let F = filmAt(b, pl, 0)
  let s = F.scene(4)
  b.marker(s.t, 'Chill · Drift', '#6aa7b0')
  titleCard(F, s.t, s.d, { kicker: 'ONE TRIP', title: 'Four Moods', subtitle: 'Slow mornings to loud nights', tr: null })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Slow morning light', { kb: 'in' })
  dayChip(F, s.t + 0.6, F.at(3), 'CHILL · DRIFT')
  caption(F, s.t + F.at(0.6), F.at(3), 'It starts slowly, with coffee and a window.')
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Breakfast by the water', caption: 'no plans, no rush', date: 'DAY 01', side: 'left', rot: -3, paper: '#1b1730', ink: '#f3eefb' })
  expectEnd(F, pl[0], 'journeyFourMoods')

  // Adventure · Trailhead
  F = filmAt(b, pl, 1)
  s = F.scene(4)
  b.marker(s.t, 'Adventure · Trailhead', '#d98c5f')
  chapterCard(F, s.t, s.d, { num: 'II', title: 'The Climb', sub: 'ADVENTURE · TRAILHEAD', over: true, label: 'Chapter II · trail at first light' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Boots on the trail', 'River crossing', 'Ridge line', 'Summit push'], { fast: true })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Switchbacks', 'Alpine meadow'])
  lowerThird(F, s.t + 0.8, s.d - 1.4, { title: 'Day 2 · The ridge', sub: '14 km · 780 m ascent', tag: 'DAY 02' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Summit cairn', 'Cloud sea', 'Trail marker'])
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '62 km', label: 'DISTANCE' }, { value: '4,208 m', label: 'SUMMIT' }, { value: '3', label: 'DAYS' }], { label: 'Stats backdrop · wide valley' })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Hero shot · view from the top', { kb: 'out' })
  caption(F, s.t + F.at(0.6), F.at(3), 'Every step up is a decision you make again.')
  expectEnd(F, pl[1], 'journeyFourMoods')

  // Hip · Boom Bap
  F = filmAt(b, pl, 2)
  s = F.scene(2)
  b.marker(s.t, 'Hip · Boom Bap', '#ff6a2b')
  bigWord(F, s.t, s.d, 'AFTER DARK', { sub: 'HIP · BOOM BAP', bg: '#ff6a2b', color: '#14111f', subColor: '#14111f' })
  s = F.scene(6)
  shots(F, s.t, s.d, ['Neon crossing', 'Subway steps', 'Rooftop view', 'Alley light', 'Taxi glow', 'Crosswalk'], { fast: true })
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'The city is a canvas. The night is the paint.', author: '— YOUR NAME', bg: MIX.dark })
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Corner store', caption: 'late-night snacks', date: '01:12', side: 'right', rot: 3, paper: '#1b1730', ink: '#f3eefb' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Subway platform', 'Last train'])
  lowerThird(F, s.t + 0.8, s.d - 1.4, { title: 'Last Train Home', sub: 'Line 7 · 02:41', tag: 'NIGHT' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Wet asphalt', 'Steam', 'First light'])
  expectEnd(F, pl[2], 'journeyFourMoods')

  // Enjoy · Good Vibes
  F = filmAt(b, pl, 3)
  s = F.scene(4)
  b.marker(s.t, 'Enjoy · Good Vibes', '#ffb43a')
  shots(F, s.t, s.d, ['Cannonball', 'Campfire', 'Karaoke', 'Sparklers'], { fast: true })
  dayChip(F, s.t + 0.5, F.at(3), 'ENJOY · GOOD VIBES')
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '4', label: 'MOODS' }, { value: '9 days', label: 'TOGETHER' }, { value: '1,000', label: 'PHOTOS' }], { label: 'Stats backdrop · beach panorama' })
  s = F.scene(4)
  bigStatement(F, s.t, s.d, 'WHAT A JOURNEY', { sub: 'FOUR MOODS · ONE TRIP', label: 'Hero shot · the whole group' })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Where next?', sub: 'Pick a mood. Pack a bag.', handle: '@yourhandle' })
  expectEnd(F, pl[3], 'journeyFourMoods')

  mixMusic(b, pl)
  return b.done()
}

// =============================================================================================
// 2. Travel mixtape — six songs, each introduced with a "now playing" lower-third
// =============================================================================================
const MIXTAPE: Part[] = [
  { track: 'music-drift', fromBar: 8, bars: 8 },
  { track: 'music-trailhead', fromBar: 32, bars: 12 },
  { track: 'music-open-road', fromBar: 16, bars: 16 },
  { track: 'music-boom-bap', fromBar: 36, bars: 12 },
  { track: 'music-plot-twist', fromBar: 24, bars: 16 },
  { track: 'music-good-vibes', fromBar: 24, bars: 16 },
]
function nowPlaying(F: Film, p: Planned, t: number, d: number, label: string) {
  shot(F, t, d, label, { kb: 'in', tr: t === 0 ? null : undefined })
  lowerThird(F, t + 0.5, d - 1.2, { title: p.name, sub: `${p.mood} · ${p.bpm} BPM`, tag: 'NOW PLAYING' })
}
function travelMixtape(): Project {
  const pl = plan(MIXTAPE)
  const dur = totalOf(pl)
  const b = new TemplateBuilder(`Travel mixtape · ${fmt(dur)}`, '16:9', dur, MIX.dark)
  vignette(filmAt(b, pl, 0), dur, 0.3)
  progress(filmAt(b, pl, 0), dur)
  let F: Film
  let s: ReturnType<Film['scene']>

  // 1 · Drift
  F = filmAt(b, pl, 0)
  s = F.scene(4)
  b.marker(s.t, '1 · Drift', '#6aa7b0')
  titleCard(F, s.t, s.d, { kicker: 'VOL. 1', title: 'Travel Mixtape', subtitle: 'Six songs · six moods · one journey', tr: null })
  s = F.scene(4); nowPlaying(F, pl[0], s.t, s.d, 'Morning on the water')
  expectEnd(F, pl[0], 'travelMixtape')

  // 2 · Trailhead
  F = filmAt(b, pl, 1)
  s = F.scene(4); b.marker(s.t, '2 · Trailhead', '#d98c5f'); nowPlaying(F, pl[1], s.t, s.d, 'Trailhead at sunrise')
  s = F.scene(4); shots(F, s.t, s.d, ['Boots', 'Switchbacks', 'Meadow', 'Ridge'], { fast: true })
  s = F.scene(4); polaroid(F, s.t, s.d, { label: 'Trail picnic', caption: 'best lunch ever', date: 'DAY 02', side: 'left', rot: -3, paper: '#1b1730', ink: '#f3eefb' })
  expectEnd(F, pl[1], 'travelMixtape')

  // 3 · Open Road
  F = filmAt(b, pl, 2)
  s = F.scene(4); b.marker(s.t, '3 · Open Road', '#ff9a3b'); nowPlaying(F, pl[2], s.t, s.d, 'Windscreen view at 100 km/h')
  s = F.scene(8); shots(F, s.t, s.d, ['Highway', 'Gas station', 'Desert road', 'Mountain pass', 'Diner', 'Tunnel', 'Sunset drive', 'Motel sign'], { fast: true })
  s = F.scene(4); stats(F, s.t, s.d, [{ value: '1,240 km', label: 'DRIVEN' }, { value: '7', label: 'STATES' }, { value: '3', label: 'FLAT TYRES' }], { label: 'Stats backdrop · open highway' })
  expectEnd(F, pl[2], 'travelMixtape')

  // 4 · Boom Bap
  F = filmAt(b, pl, 3)
  s = F.scene(4); b.marker(s.t, '4 · Boom Bap', '#ff6a2b'); nowPlaying(F, pl[3], s.t, s.d, 'City street at night')
  s = F.scene(4); triptych(F, s.t, s.d, ['Sneakers', 'Skyline', 'Street art'])
  s = F.scene(4); shots(F, s.t, s.d, ['Neon', 'Subway', 'Rooftop', 'Alley'], { fast: true })
  expectEnd(F, pl[3], 'travelMixtape')

  // 5 · Plot Twist (starts on its chorus)
  F = filmAt(b, pl, 4)
  s = F.scene(4); b.marker(s.t, '5 · Plot Twist', '#e0508a'); nowPlaying(F, pl[4], s.t, s.d, 'Mystery destination')
  s = F.scene(8); shots(F, s.t, s.d, ['Clue 1', 'Clue 2', 'Clue 3', 'Clue 4'], { fast: true })
  s = F.scene(2); bigWord(F, s.t, s.d, 'SURPRISE!', { sub: 'WE ARE GOING TO LISBON', bg: '#ffd23f', color: '#150f28', subColor: '#150f28' })
  s = F.scene(2); shot(F, s.t, s.d, 'Lisbon tram at golden hour', { kb: 'out' })
  expectEnd(F, pl[4], 'travelMixtape')

  // 6 · Good Vibes
  F = filmAt(b, pl, 5)
  s = F.scene(4); b.marker(s.t, '6 · Good Vibes', '#ffb43a'); nowPlaying(F, pl[5], s.t, s.d, 'Friends on the beach')
  s = F.scene(4); shots(F, s.t, s.d, ['Cheers', 'Sunburn', 'Dance floor', 'Sparklers'], { fast: true })
  s = F.scene(4); bigStatement(F, s.t, s.d, 'PLAY IT AGAIN', { sub: 'SIX SONGS · ONE SUMMER', label: 'Closing shot · sunset' })
  s = F.scene(4); endCard(F, s.t, s.d, { title: 'Thanks for listening', sub: 'Volume 2 is on the way', handle: '@yourhandle' })
  expectEnd(F, pl[5], 'travelMixtape')

  mixMusic(b, pl, { xf: 2 })
  return b.done()
}

// =============================================================================================
// 3. Mood switch — one minute, three songs: Drift → Plot Twist (with its silent stop bar) → Good Vibes
// =============================================================================================
const SWITCH: Part[] = [
  { track: 'music-drift', fromBar: 24, bars: 6 },
  { track: 'music-plot-twist', fromBar: 16, bars: 10 },
  { track: 'music-good-vibes', fromBar: 24, bars: 8 },
]
function moodSwitch(): Project {
  const pl = plan(SWITCH)
  const dur = totalOf(pl)
  const b = new TemplateBuilder(`Mood switch · ${fmt(dur)}`, '16:9', dur, MIX.dark)
  vignette(filmAt(b, pl, 0), dur, 0.3)

  let F = filmAt(b, pl, 0)
  let s = F.scene(3)
  b.marker(s.t, 'Chill', '#6aa7b0')
  shot(F, s.t, s.d, 'Quiet morning', { kb: 'in', tr: null })
  dayChip(F, s.t + 0.6, F.at(2), 'MOOD 1 · CHILL')
  caption(F, s.t + F.at(0.5), F.at(2.2), 'It begins quietly.')
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Coffee and a view', caption: 'before the plot twist', date: '07:30', side: 'right', rot: 3, paper: '#1b1730', ink: '#f3eefb' })
  expectEnd(F, pl[0], 'moodSwitch')

  F = filmAt(b, pl, 1)
  b.marker(F.time, 'Surprise', '#e0508a')
  s = F.scene(2); bigWord(F, s.t, s.d, 'WAIT FOR IT', { sub: 'MOOD 2 · SURPRISE', bg: '#9a5bf5' })
  s = F.scene(4); shots(F, s.t, s.d, ['Clue 1', 'Clue 2', 'Clue 3', 'Clue 4'], { fast: true })
  s = F.scene(1); bigWord(F, s.t, s.d, 'READY?', { bg: '#e0508a' })
  s = F.scene(1); bigWord(F, s.t, s.d, '?', { bg: '#000000', color: '#ffd23f' }) // silent stop bar of Plot Twist
  s = F.scene(2); bigWord(F, s.t, s.d, 'SURPRISE!', { bg: '#ffd23f', color: '#150f28' })
  expectEnd(F, pl[1], 'moodSwitch')

  F = filmAt(b, pl, 2)
  s = F.scene(4)
  b.marker(s.t, 'Enjoy', '#ffb43a')
  shots(F, s.t, s.d, ['Splash', 'Ice cream', 'Skate park', 'Picnic'], { fast: true })
  dayChip(F, s.t + 0.5, F.at(3), 'MOOD 3 · ENJOY')
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Pick your mood', sub: 'Chill · Surprise · Enjoy', handle: '@yourhandle' })
  expectEnd(F, pl[2], 'moodSwitch')

  mixMusic(b, pl, { xf: 1.6, fadeOut: 2.5 })
  return b.done()
}

export const MIX_TEMPLATES: TemplateDef[] = [
  { id: 'journey-four-moods', name: 'Journey in four moods', description: `Four songs, four moods (${fmt(totalOf(plan(JOURNEY)))}): chill morning, trail adventure, hip city night and a feel-good finale. The music crossfades as the story changes.`, category: 'travel', aspect: '16:9', duration: totalOf(plan(JOURNEY)), previewTime: 6.5, music: musicNames(JOURNEY), build: journeyFourMoods },
  { id: 'travel-mixtape', name: 'Travel mixtape', description: `Six songs, each announced with a "now playing" card (${fmt(totalOf(plan(MIXTAPE)))}). Chill, adventure, road, hip, surprise and enjoy, crossfaded.`, category: 'travel', aspect: '16:9', duration: totalOf(plan(MIXTAPE)), previewTime: 9, music: musicNames(MIXTAPE), build: travelMixtape },
  { id: 'mood-switch', name: 'Mood switch', description: `One-minute highlight (${fmt(totalOf(plan(SWITCH)))}) that jumps from chill to a surprise reveal on a silent beat to a feel-good finish, with three songs.`, category: 'travel', aspect: '16:9', duration: totalOf(plan(SWITCH)), previewTime: 3, music: musicNames(SWITCH), build: moodSwitch },
]
