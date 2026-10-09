/**
 * Long-form travel & adventure films (2–4 minutes). Each one is storyboarded in *bars* of the bundled
 * music track it uses, so chapters, builds and drops land on the beat. All content is editable:
 * footage frames are placeholders for the user's own clips, text is real text.
 */
import type { Project } from '@/types'
import type { TemplateDef } from './travel'
import { TemplateBuilder } from './helpers'
import {
  bigStatement, caption, chapterCard, credits, dayChip, endCard, Film, letterbox, locationTag, lowerThird, keyline, polaroid, progress, quote, shot, shots, stats, titleCard, triptych, vignette,
  type Style,
} from './scenes'
import { barSeconds, trackById } from './samples'

/** Template length for `bars` bars of a given track, rounded up to 10 ms so the last clip always fits. */
export const barsDuration = (trackId: string, bars: number) => Math.ceil(barSeconds(trackById(trackId)!) * bars * 100) / 100

const EPIC: Style = { heading: 'Playfair Display', script: 'DM Serif Display', sans: 'Inter', accent: '#e0b15a', ink: '#ffffff', mute: 'rgba(255,255,255,0.78)', dark: '#0d1117', tones: ['#5d7f8c', '#a77f64', '#6f8c70', '#7b86a8', '#b79d6a', '#8a6f86'] }
const ISLAND: Style = { heading: 'Playfair Display', script: 'DM Serif Display', sans: 'Poppins', accent: '#ff7a59', ink: '#ffffff', mute: 'rgba(255,255,255,0.82)', dark: '#0f2a33', tones: ['#5fb8c9', '#f0b27a', '#7fc4a8', '#8fa7d6', '#e6c98e', '#c99cc0'] }
const YEAR: Style = { heading: 'Poppins', script: 'DM Serif Display', sans: 'Plus Jakarta Sans', accent: '#9a5bf5', ink: '#ffffff', mute: 'rgba(255,255,255,0.8)', dark: '#14111f', tones: ['#7c8fd6', '#e59a7a', '#66b8a4', '#c3a0e0', '#e3c477', '#6aa7d9'] }
const WILD: Style = { heading: 'Playfair Display', script: 'DM Serif Display', sans: 'Inter', accent: '#d9a441', ink: '#ffffff', mute: 'rgba(255,255,255,0.8)', dark: '#10160f', tones: ['#6f9a72', '#9c8a62', '#5d7f6a', '#a9835e', '#7b9a8c', '#8c7a58'] }
const ROAD: Style = { heading: 'Space Grotesk', script: 'DM Serif Display', sans: 'Inter', accent: '#ff6a2b', ink: '#ffffff', mute: 'rgba(255,255,255,0.8)', dark: '#15110f', tones: ['#d98a5f', '#7aa3b5', '#c9a06a', '#8d9a6a', '#b77a6a', '#6f8fb0'] }
const PACK: Style = { heading: 'Poppins', script: 'DM Serif Display', sans: 'Poppins', accent: '#f5c518', ink: '#ffffff', mute: 'rgba(255,255,255,0.82)', dark: '#0b0f14', tones: ['#68a58a', '#d98c5f', '#7a92c9', '#c9b06a', '#b585a8', '#5fa6b8'] }
const CITY: Style = { heading: 'Space Grotesk', script: 'DM Serif Display', sans: 'Inter', accent: '#ff4d8d', ink: '#ffffff', mute: 'rgba(255,255,255,0.8)', dark: '#0c0e1a', tones: ['#6f86d6', '#e0805f', '#5fb0b0', '#b085d6', '#d6b06f', '#6fa0d6'] }
const BEACH: Style = { heading: 'Playfair Display', script: 'DM Serif Display', sans: 'Poppins', accent: '#ff9a76', ink: '#ffffff', mute: 'rgba(255,255,255,0.84)', dark: '#1b1230', tones: ['#f0a27a', '#e0788f', '#7aa6d6', '#f2c27a', '#9a86c9', '#78b9b0'] }

const names = (prefix: string, n: number, from = 1) => Array.from({ length: n }, (_, i) => `${prefix} ${String(i + from).padStart(2, '0')}`)

// =============================================================================================
// 1. Epic adventure film — 4:00, 16:9, Summit (90 BPM, 90 bars)
// =============================================================================================
const EPIC_BARS = 90
function epicFilm(): Project {
  const bpm = trackById('music-summit')!.bpm
  const dur = barsDuration('music-summit', EPIC_BARS)
  const b = new TemplateBuilder('Epic adventure film · 4 min', '16:9', dur, '#0d1117')
  const F = new Film(b, EPIC, bpm)
  letterbox(F, dur, 0.085)
  vignette(F, dur, 0.5)
  const gold = EPIC.accent

  // Cold open
  let s = F.scene(6)
  shot(F, s.t, s.d, 'Cold open · first light over the ridge', { kb: 'in', tr: null, tone: '#5d7f8c' })
  caption(F, s.t + F.at(0.5), F.at(1.9), 'Some journeys begin long before the first step.')
  caption(F, s.t + F.at(2.5), F.at(1.9), 'This one began with a map, a bad idea and three stubborn friends.')
  caption(F, s.t + F.at(4.5), F.at(1.4), 'And a mountain that does not care.')
  s = F.scene(2)
  b.marker(s.t, 'Title', gold)
  titleCard(F, s.t, s.d, { kicker: 'A TRAILHEAD FILM', title: 'THE LONG WAY UP', subtitle: 'Four days · 62 km · one summit', tr: { type: 'blur-dissolve', duration: 1.4 } })

  // Chapter I — The Call (8–20)
  s = F.scene(2)
  b.marker(s.t, 'I · The Call', gold)
  chapterCard(F, s.t, s.d, { num: 'I', title: 'The Call', sub: 'BASECAMP · 1,240 M', over: true, label: 'Chapter I · valley at dawn' })
  s = F.scene(3)
  shots(F, s.t, s.d, ['Valley road', 'Pine forest edge'])
  locationTag(F, s.t + 1, s.d - 1.6, 'VAL DI FUNES', '46.64° N · 11.72° E')
  s = F.scene(3)
  shot(F, s.t, s.d, 'Trail ascent', { kb: 'right' })
  lowerThird(F, s.t + 0.6, s.d - 1.2, { title: 'Day 1 · Into the forest', sub: '14 km · 780 m ascent', tag: 'DAY 01' })
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'We do not climb to conquer the mountain. We climb to find out who we are.', author: '— YOUR NAME', bg: EPIC.dark })

  // Chapter II — The Climb (20–32)
  s = F.scene(2)
  b.marker(s.t, 'II · The Climb', gold)
  chapterCard(F, s.t, s.d, { num: 'II', title: 'The Climb', sub: 'TREELINE · 2,400 M', over: true, label: 'Chapter II · above the trees' })
  s = F.scene(5)
  shots(F, s.t, s.d, ['Switchbacks', 'Alpine meadow', 'Glacier stream'])
  locationTag(F, s.t + 0.8, F.at(1.8), 'ALPE DI SIUSI', '46.54° N · 11.62° E')
  caption(F, s.t + F.at(2.6), F.at(2), 'Every step up is a decision you make again.')
  s = F.scene(5)
  shots(F, s.t, s.d, ['Camp at golden hour', 'Night sky'])
  lowerThird(F, s.t + 0.6, s.d * 0.5 - 1, { title: 'Day 2 · High camp', sub: '2,950 m · sleeping bags and soup', tag: 'DAY 02' })

  // Build (32–40)
  s = F.scene(6)
  b.marker(s.t, 'The push', '#e3a05a')
  shots(F, s.t, s.d, ['Crampons', 'Rope team', 'Wind on the ridge', 'Last water', 'Cloud break', 'Headlamps'], { fast: true })
  s = F.scene(2)
  shots(F, s.t, s.d, ['Summit push 1', 'Summit push 2', 'Summit push 3', 'Summit push 4'], { fast: true })

  // Chapter III — The Summit (40–60)
  s = F.scene(2)
  b.marker(s.t, 'III · The Summit', gold)
  chapterCard(F, s.t, s.d, { num: 'III', title: 'The Summit', sub: 'SUMMIT RIDGE · 4,208 M', over: true, label: 'Chapter III · final ridge' })
  s = F.scene(5)
  shot(F, s.t, s.d, 'Hero shot · summit ridge', { kb: 'in' })
  keyline(F, s.t + 0.5, s.d - 1)
  lowerThird(F, s.t + 1, s.d - 2, { title: 'Summit ridge · 4,208 m', sub: 'Day 3 · 05:42 · first sun on the glacier', tag: 'DAY 03' })
  s = F.scene(3)
  triptych(F, s.t, s.d, ['Summit cairn', 'Ridge line', 'Sea of clouds'])
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '62 km', label: 'DISTANCE' }, { value: '4,208 m', label: 'SUMMIT' }, { value: '3,160 m', label: 'ELEVATION GAIN' }], { label: 'Stats backdrop · wide valley' })
  s = F.scene(6)
  shot(F, s.t, s.d, 'Hero shot · view from the top', { kb: 'out' })
  caption(F, s.t + F.at(0.6), F.at(2.2), 'The summit is only halfway.')
  caption(F, s.t + F.at(3.2), F.at(2.4), 'The rest is getting home.')

  // Bridge (60–70)
  s = F.scene(4)
  b.marker(s.t, 'The descent', '#9aa5c4')
  quote(F, s.t, s.d, { text: 'The mountains are calling and I must go.', author: '— JOHN MUIR', bg: EPIC.dark })
  s = F.scene(3)
  shot(F, s.t, s.d, 'Descent · switchbacks', { kb: 'left' })
  caption(F, s.t + 0.8, s.d - 1.8, 'Going down is its own kind of quiet.')
  s = F.scene(3)
  shot(F, s.t, s.d, 'Alpine lake at dusk', { kb: 'in' })
  locationTag(F, s.t + 0.8, s.d - 1.8, 'LAGO DI BRAIES', '46.69° N · 12.08° E')

  // Finale (70–82)
  s = F.scene(2)
  b.marker(s.t, 'IV · The Return', gold)
  chapterCard(F, s.t, s.d, { num: 'IV', title: 'The Return', sub: 'BASECAMP · 1,240 M', over: true, label: 'Chapter IV · back in the valley' })
  s = F.scene(6)
  shots(F, s.t, s.d, ['Walking out', 'Hot coffee', 'Team photo'])
  lowerThird(F, s.t + F.at(2.3), F.at(1.6), { title: 'Day 4 · Home', sub: 'Tired, sunburnt, happy', tag: 'DAY 04' })
  s = F.scene(4)
  bigStatement(F, s.t, s.d, 'WE WERE HERE', { sub: 'MARCH 14 · 05:42', label: 'Closing shot · summit selfie' })

  // Outro (82–90)
  s = F.scene(6)
  b.marker(s.t, 'Credits', '#a3a7b3')
  credits(F, s.t, s.d, {
    heading: 'THE LONG WAY UP',
    lines: ['A TRAILHEAD FILM', '', 'DIRECTED BY', 'Your Name', '', 'CAMERA', 'Your Name', '', 'MUSIC', 'Summit · Trailhead original', '', 'SPECIAL THANKS', 'Everyone who carried a heavier pack'],
  })
  s = F.scene(2)
  endCard(F, s.t, s.d, { title: 'See you on the next ridge', sub: 'trailhead.example', handle: '@yourhandle' })

  b.audioTrack('Music · Summit (Trailhead original)')
  b.music('music-summit', { fadeIn: 2, fadeOut: F.at(4) })
  return b.done()
}

// =============================================================================================
// 2. Island hopping journal — 4:00, 16:9, Golden Hour (84 BPM, 84 bars)
// =============================================================================================
const ISLAND_BARS = 84
function islandBlock(F: Film, n: number, o: { name: string; country: string; coords: string; day: string; line: string; dates: [string, string]; captions: [string, string]; labels: string[] }) {
  const { b } = F
  let s = F.scene(2)
  b.marker(s.t, `${String(n).padStart(2, '0')} · ${o.name}`, F.S.accent)
  chapterCard(F, s.t, s.d, { num: String(n).padStart(2, '0'), title: o.name, sub: o.country, over: true, label: `${o.name} · arrival from the sea` })
  s = F.scene(3)
  shots(F, s.t, s.d, [o.labels[0], o.labels[1]])
  locationTag(F, s.t + 1, s.d - 1.8, o.name.toUpperCase(), o.coords)
  s = F.scene(2)
  polaroid(F, s.t, s.d, { label: `${o.name} · favourite photo`, caption: o.captions[0], date: o.dates[0], side: 'left', rot: -3 })
  s = F.scene(2)
  polaroid(F, s.t, s.d, { label: `${o.name} · second photo`, caption: o.captions[1], date: o.dates[1], side: 'right', rot: 3 })
  s = F.scene(3)
  shots(F, s.t, s.d, [o.labels[2], o.labels[3]])
  lowerThird(F, s.t + 0.8, s.d - 1.6, { title: o.line, sub: `${o.name}, ${o.country.split(' · ')[0]}`, tag: o.day })
  s = F.scene(2)
  triptych(F, s.t, s.d, [`${o.name} · detail 1`, `${o.name} · detail 2`, `${o.name} · detail 3`])
  s = F.scene(2)
  shot(F, s.t, s.d, `${o.name} · golden hour`, { kb: 'out' })
  caption(F, s.t + 0.6, s.d - 1.4, o.captions[1])
}

function islandHopping(): Project {
  const bpm = trackById('music-golden-hour')!.bpm
  const dur = barsDuration('music-golden-hour', ISLAND_BARS)
  const b = new TemplateBuilder('Island hopping journal · 4 min', '16:9', dur, '#0f2a33')
  const F = new Film(b, ISLAND, bpm)
  vignette(F, dur, 0.34)
  progress(F, dur)

  let s = F.scene(4)
  b.marker(s.t, 'Title', ISLAND.accent)
  titleCard(F, s.t, s.d, { kicker: 'SUMMER JOURNAL', title: 'ISLAND HOPPING', subtitle: 'Four islands · twenty-one days · one backpack', tr: null })
  islandBlock(F, 1, { name: 'Santorini', country: 'GREECE · CYCLADES', coords: '36.39° N · 25.46° E', day: 'DAY 02', line: 'Sunset in Oia', dates: ['12 JUN', '13 JUN'], captions: ['the caldera at dusk', 'blue domes, bluer sea'], labels: ['Caldera view', 'Whitewashed lanes', 'Oia sunset', 'Cliffside terrace'] })
  islandBlock(F, 2, { name: 'Naxos', country: 'GREECE · CYCLADES', coords: '37.10° N · 25.38° E', day: 'DAY 07', line: 'The Portara at golden hour', dates: ['17 JUN', '18 JUN'], captions: ['slow mornings', 'olive groves for miles'], labels: ['Portara gate', 'Old town alleys', 'Plaka beach', 'Mountain village'] })
  islandBlock(F, 3, { name: 'Milos', country: 'GREECE · CYCLADES', coords: '36.74° N · 24.42° E', day: 'DAY 12', line: 'Sarakiniko moonscape', dates: ['22 JUN', '23 JUN'], captions: ['white rock, clear water', 'fishing boats at rest'], labels: ['Sarakiniko', 'Kleftiko by boat', 'Fishing village', 'Cliff jump'] })

  s = F.scene(4)
  b.marker(s.t, 'Interlude', '#9aa5c4')
  quote(F, s.t, s.d, { text: 'Not all those who wander are lost.', author: '— J.R.R. TOLKIEN', bg: ISLAND.dark })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Ferry deck at sunrise', { kb: 'right' })
  caption(F, s.t + 0.8, s.d - 1.8, 'Next stop: the last island.')

  islandBlock(F, 4, { name: 'Paros', country: 'GREECE · CYCLADES', coords: '37.04° N · 25.15° E', day: 'DAY 17', line: 'Naoussa harbour nights', dates: ['27 JUN', '28 JUN'], captions: ['lights on the water', 'one more swim'], labels: ['Naoussa harbour', 'Lefkes village', 'Kolymbithres rocks', 'Windmill ridge'] })

  s = F.scene(4)
  b.marker(s.t, 'Memories', '#e6c98e')
  shots(F, s.t, s.d, names('Memory', 8), { fast: true })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Until the next island', sub: 'Twenty-one days, four islands, zero regrets', handle: '@yourhandle' })

  b.audioTrack('Music · Golden Hour (Trailhead original)')
  b.music('music-golden-hour', { fadeIn: 2, fadeOut: F.at(4) })
  return b.done()
}

// =============================================================================================
// 3. Around the world · year recap — 4:00, 16:9, Trailhead (112 BPM, 112 bars)
// =============================================================================================
const YEAR_BARS = 112
function quarterBlock(F: Film, q: number, o: { months: string; countries: number; places: { name: string; note: string; coords: string }[]; stats: [string, string, string] }) {
  const { b } = F
  let s = F.scene(2)
  b.marker(s.t, `Q${q} · ${o.months}`, F.S.accent)
  chapterCard(F, s.t, s.d, { num: `Q${q}`, title: o.months, sub: `${o.countries} COUNTRIES`, over: true, label: `Q${q} · opening shot` })
  o.places.forEach((p, i) => {
    s = F.scene(4)
    shot(F, s.t, s.d, `${p.name} · hero shot`, { kb: (['in', 'right', 'out'] as const)[i] })
    locationTag(F, s.t + 0.6, s.d - 1.6, p.name.toUpperCase(), p.coords)
    lowerThird(F, s.t + 1.2, s.d - 2.2, { title: p.name, sub: p.note, tag: `0${i + 1}` })
  })
  s = F.scene(4)
  shots(F, s.t, s.d, names(`Q${q} moment`, 8), { fast: true })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: o.stats[0], label: 'ON THE ROAD' }, { value: o.stats[1], label: 'TRAVELLED' }, { value: o.stats[2], label: 'PHOTOS' }], { label: `Q${q} stats backdrop` })
}

function yearRecap(): Project {
  const bpm = trackById('music-trailhead')!.bpm
  const dur = barsDuration('music-trailhead', YEAR_BARS)
  const b = new TemplateBuilder('Around the world · year recap', '16:9', dur, '#14111f')
  const F = new Film(b, YEAR, bpm)
  vignette(F, dur, 0.38)
  progress(F, dur)

  let s = F.scene(3)
  shot(F, s.t, s.d, 'Cold open · airport window', { kb: 'in', tr: null })
  caption(F, s.t + 1, s.d - 2, 'Twelve months. Four continents. One very tired passport.')
  s = F.scene(5)
  b.marker(s.t, 'Title', YEAR.accent)
  titleCard(F, s.t, s.d, { kicker: 'MY YEAR ON THE ROAD', title: 'AROUND THE WORLD', subtitle: '2026 · the recap' })
  quarterBlock(F, 1, { months: 'January – March', countries: 3, places: [{ name: 'Lisbon', note: 'Tram 28 and pastel de nata', coords: '38.72° N · 9.14° W' }, { name: 'Marrakech', note: 'Souks, spice and rooftop tea', coords: '31.63° N · 8.01° W' }, { name: 'Cappadocia', note: 'Balloons over fairy chimneys', coords: '38.64° N · 34.83° E' }], stats: ['86 days', '14,210 km', '4,812'] })
  quarterBlock(F, 2, { months: 'April – June', countries: 3, places: [{ name: 'Kyoto', note: 'Cherry blossom at Maruyama', coords: '35.01° N · 135.77° E' }, { name: 'Hanoi', note: 'Egg coffee on Train Street', coords: '21.03° N · 105.85° E' }, { name: 'Ubud', note: 'Rice terraces at sunrise', coords: '8.51° S · 115.26° E' }], stats: ['91 days', '17,950 km', '5,336'] })
  quarterBlock(F, 3, { months: 'July – September', countries: 3, places: [{ name: 'Reykjavik', note: 'Midnight sun and hot springs', coords: '64.15° N · 21.94° W' }, { name: 'Banff', note: 'Turquoise lakes and bear spray', coords: '51.18° N · 115.57° W' }, { name: 'Patagonia', note: 'Granite towers at dawn', coords: '50.94° S · 73.41° W' }], stats: ['92 days', '21,070 km', '6,127'] })
  quarterBlock(F, 4, { months: 'October – December', countries: 3, places: [{ name: 'Cape Town', note: 'Table Mountain in the clouds', coords: '33.92° S · 18.42° E' }, { name: 'Petra', note: 'The Treasury at first light', coords: '30.33° N · 35.44° E' }, { name: 'Oaxaca', note: 'Mezcal, mole and murals', coords: '17.07° N · 96.73° W' }], stats: ['92 days', '19,640 km', '5,904'] })

  s = F.scene(8)
  b.marker(s.t, 'The finale', YEAR.accent)
  shots(F, s.t, s.d, names('Favourite', 12), { fast: true })
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'Once a year, go someplace you have never been before.', author: '— DALAI LAMA', bg: YEAR.dark })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'See you in 2027', sub: 'Where to next?', handle: '@yourhandle' })

  b.audioTrack('Music · Trailhead (Trailhead original)')
  b.music('music-trailhead', { fadeIn: 2, fadeOut: F.at(4) })
  return b.done()
}

// =============================================================================================
// 4. Wild trails & camping — 3:43, 16:9, Trailhead from bar 8 (104 bars)
// =============================================================================================
const WILD_BARS = 104
function wildTrails(): Project {
  const bpm = trackById('music-trailhead')!.bpm
  const dur = barsDuration('music-trailhead', WILD_BARS)
  const b = new TemplateBuilder('Wild trails & camping · 3:43', '16:9', dur, '#10160f')
  const F = new Film(b, WILD, bpm)
  vignette(F, dur, 0.42)
  progress(F, dur)

  // Morning (0–16)
  let s = F.scene(4)
  shot(F, s.t, s.d, 'Cold open · mist in the pines', { kb: 'in', tr: null })
  caption(F, s.t + 1, s.d - 2.2, 'Leave the signal behind.')
  s = F.scene(4)
  b.marker(s.t, 'Title', WILD.accent)
  titleCard(F, s.t, s.d, { kicker: 'TRAILS · CAMPFIRES · STARS', title: 'INTO THE WILD', subtitle: 'A long weekend off the grid' })
  s = F.scene(2)
  b.marker(s.t, 'I · Trailhead', WILD.accent)
  chapterCard(F, s.t, s.d, { num: 'I', title: 'Trailhead', sub: 'DAY ONE · 06:30', over: true, label: 'Trailhead sign at dawn' })
  s = F.scene(3)
  shots(F, s.t, s.d, ['Boots on the trail', 'Creek crossing'])
  locationTag(F, s.t + 0.8, s.d - 1.6, 'BLACK FOREST NP', '48.54° N · 8.21° E')
  s = F.scene(3)
  shot(F, s.t, s.d, 'Into the pines', { kb: 'right' })
  lowerThird(F, s.t + 0.6, s.d - 1.2, { title: 'Into the pines', sub: '9 km · 420 m ascent', tag: 'DAY 01' })

  // Build (16–24)
  s = F.scene(8)
  b.marker(s.t, 'Momentum', '#e3a05a')
  shots(F, s.t, s.d, names('Trail moment', 16), { fast: true })

  // Ridge (24–40)
  s = F.scene(2)
  b.marker(s.t, 'II · The Ridge', WILD.accent)
  chapterCard(F, s.t, s.d, { num: 'II', title: 'The Ridge', sub: 'SUMMIT · 2,310 M', over: true, label: 'Ridge line in the morning light' })
  s = F.scene(6)
  shots(F, s.t, s.d, ['Open ridge', 'Wildflowers', 'Valley below'])
  locationTag(F, s.t + 0.8, F.at(1.8), 'HOHER IFEN', '47.37° N · 10.10° E')
  locationTag(F, s.t + F.at(2.2), F.at(1.8), 'WIDDERSTEIN', '47.28° N · 10.19° E')
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '24 km', label: 'WALKED' }, { value: '1,180 m', label: 'CLIMBED' }, { value: '2 nights', label: 'UNDER CANVAS' }], { label: 'Stats backdrop · ridge' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Cairn', 'Wild thyme', 'Cloud shadows'])

  // Campfire (40–56)
  s = F.scene(2)
  b.marker(s.t, 'III · Campfire', WILD.accent)
  chapterCard(F, s.t, s.d, { num: 'III', title: 'Campfire', sub: 'DAY TWO · 19:40' })
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Camp kitchen', caption: 'dinner at 2,000 m', date: '14 SEP', side: 'left', rot: -3, paper: '#efe6d3' })
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Fire glow', caption: 'stories by the fire', date: '14 SEP', side: 'right', rot: 3, paper: '#efe6d3' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Flames up close', 'Marshmallows'])
  caption(F, s.t + 0.8, s.d - 1.8, 'Dinner tastes better when you carried it.')
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'In every walk with nature one receives far more than he seeks.', author: '— JOHN MUIR', bg: WILD.dark })

  // Night (56–72)
  s = F.scene(4)
  b.marker(s.t, 'IV · Night', '#9aa5c4')
  shot(F, s.t, s.d, 'Milky Way above the tent', { kb: 'up', tone: '#3b4a6b' })
  keyline(F, s.t + 0.6, s.d - 1.2)
  caption(F, s.t + 1, s.d - 2.2, 'More stars than you thought were allowed.')
  s = F.scene(4)
  shot(F, s.t, s.d, 'Star trails', { kb: 'left', tone: '#2f3d5c' })
  caption(F, s.t + 1, s.d - 2.2, 'Time moves differently out here.')
  s = F.scene(4)
  shots(F, s.t, s.d, ['Dawn mist', 'First light on the tent'])
  lowerThird(F, s.t + 0.8, s.d - 1.6, { title: 'First light', sub: 'Day 3 · 06:12', tag: 'DAY 03' })
  s = F.scene(4)
  bigStatement(F, s.t, s.d, 'STILLNESS', { sub: 'NO SIGNAL · NO RUSH', label: 'Lake in the morning calm' })

  // Build 2 (72–80)
  s = F.scene(8)
  b.marker(s.t, 'Heading home', '#e3a05a')
  shots(F, s.t, s.d, names('Trail moment', 16, 17), { fast: true })

  // The way back (80–96)
  s = F.scene(2)
  b.marker(s.t, 'V · The Way Back', WILD.accent)
  chapterCard(F, s.t, s.d, { num: 'V', title: 'The Way Back', sub: 'DAY THREE · 10:00', over: true, label: 'Last view of the valley' })
  s = F.scene(6)
  shots(F, s.t, s.d, ['Forest descent', 'Old stone bridge', 'Trailhead again'])
  lowerThird(F, s.t + F.at(2.2), F.at(1.7), { title: 'Back where we started', sub: 'Slightly different people', tag: 'DAY 03' })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '38 km', label: 'IN TOTAL' }, { value: '3 days', label: 'OFF THE GRID' }, { value: '0 bars', label: 'OF SIGNAL' }], { label: 'Stats backdrop · valley' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Dusty boots', 'Trail map', 'Sunburnt smiles'])

  // Outro (96–104)
  s = F.scene(4)
  b.marker(s.t, 'Credits', '#a3a7b3')
  credits(F, s.t, s.d, { heading: 'INTO THE WILD', lines: ['FILMED BY', 'Your Name', '', 'MUSIC', 'Trailhead · Trailhead original', '', 'THANKS TO', 'Good boots and strong coffee'] })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Leave only footprints', sub: 'wild.example', handle: '@yourhandle' })

  b.audioTrack('Music · Trailhead (Trailhead original)')
  b.music('music-trailhead', { fromBar: 8, fadeIn: 1.5, fadeOut: F.at(4) })
  return b.done()
}

// =============================================================================================
// 5. Road trip diary — 2:58, 16:9, Open Road from bar 32 (92 bars)
// =============================================================================================
const ROAD_BARS = 92
function dayBlock(F: Film, day: number, o: { place: string; state: string; coords: string; note: string; line: string; labels: [string, string]; extra?: string }, bars = 5) {
  const { b } = F
  let s = F.scene(2)
  b.marker(s.t, `Day ${day} · ${o.place}`, F.S.accent)
  shot(F, s.t, s.d, `${o.place} · arrival`, { kb: 'in' })
  dayChip(F, s.t + 0.4, s.d - 1, `DAY ${String(day).padStart(2, '0')}`)
  locationTag(F, s.t + 0.5, s.d - 1.2, `${o.place.toUpperCase()}, ${o.state}`, o.coords)
  s = F.scene(3)
  shots(F, s.t, s.d, o.labels)
  lowerThird(F, s.t + 0.6, s.d - 1.4, { title: o.line, sub: o.note, tag: `DAY ${String(day).padStart(2, '0')}` })
  if (bars > 5) {
    s = F.scene(bars - 5)
    shot(F, s.t, s.d, o.extra ?? `${o.place} · road shot`, { kb: 'right' })
  }
}

function roadTrip(): Project {
  const bpm = trackById('music-open-road')!.bpm
  const dur = barsDuration('music-open-road', ROAD_BARS)
  const b = new TemplateBuilder('Road trip diary · 2:58', '16:9', dur, '#15110f')
  const F = new Film(b, ROAD, bpm)
  vignette(F, dur, 0.4)
  progress(F, dur)

  // Break (0–8)
  let s = F.scene(4)
  b.marker(s.t, 'Title', ROAD.accent)
  titleCard(F, s.t, s.d, { kicker: 'ROUTE 66 · 14 DAYS', title: 'ROAD TRIP DIARY', subtitle: 'Chicago → Santa Monica', tr: null })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Packing the car', 'First mile'])
  caption(F, s.t + 0.8, s.d - 1.8, 'Windows down. Playlist up.')
  // Build (8–16)
  s = F.scene(8)
  b.marker(s.t, 'Hit the road', '#e3a05a')
  shots(F, s.t, s.d, names('Road moment', 16), { fast: true })
  // Drop (16–32)
  dayBlock(F, 1, { place: 'Chicago', state: 'IL', coords: '41.88° N · 87.63° W', note: 'Start line at Adams Street', line: 'Mile zero', labels: ['Start line sign', 'Deep-dish dinner'] })
  dayBlock(F, 2, { place: 'St. Louis', state: 'MO', coords: '38.63° N · 90.20° W', note: 'The Arch at golden hour', line: 'Gateway to the west', labels: ['Gateway Arch', 'Frozen custard'] })
  dayBlock(F, 3, { place: 'Tulsa', state: 'OK', coords: '36.15° N · 95.99° W', note: 'Art deco and neon', line: 'Blue Whale of Catoosa', labels: ['Blue Whale', 'Neon diner'], extra: 'Tulsa · long straight road' }, 6)
  // Verse (32–44)
  s = F.scene(3)
  b.marker(s.t, 'Postcards', '#7aa3b5')
  polaroid(F, s.t, s.d, { label: 'Diner breakfast', caption: 'pie before noon', date: 'DAY 03', side: 'left', rot: -3 })
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Gas-station sunset', caption: 'golden hour fuel stop', date: 'DAY 04', side: 'right', rot: 3 })
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Motel sign', caption: 'vacancy, always', date: 'DAY 05', side: 'left', rot: -2 })
  s = F.scene(3)
  quote(F, s.t, s.d, { text: 'It is not the destination. It is the road.', author: '— YOUR PASSENGER', bg: ROAD.dark })
  // Build 3 (44–52)
  s = F.scene(8)
  b.marker(s.t, 'Second wind', '#e3a05a')
  shots(F, s.t, s.d, names('Road moment', 16, 17), { fast: true })
  // Drop 3 (52–68)
  dayBlock(F, 4, { place: 'Amarillo', state: 'TX', coords: '35.22° N · 101.83° W', note: 'Cadillac Ranch in spray paint', line: 'Ten Caddies in a field', labels: ['Cadillac Ranch', 'Big Texan steak'] })
  dayBlock(F, 5, { place: 'Albuquerque', state: 'NM', coords: '35.08° N · 106.65° W', note: 'Old Town and green chile', line: 'Land of enchantment', labels: ['Old Town', 'Sandia sunset'] })
  dayBlock(F, 6, { place: 'Flagstaff', state: 'AZ', coords: '35.20° N · 111.65° W', note: 'Pine forests at 2,100 m', line: 'Almost to the Pacific', labels: ['Route 66 sign', 'Snowy peaks'], extra: 'Flagstaff · road through the pines' }, 6)
  // Finale (68–84)
  s = F.scene(4)
  b.marker(s.t, 'The numbers', ROAD.accent)
  stats(F, s.t, s.d, [{ value: '3,940 km', label: 'DRIVEN' }, { value: '8 states', label: 'CROSSED' }, { value: '31 coffees', label: 'CONSUMED' }], { label: 'Stats backdrop · open highway' })
  s = F.scene(6)
  shots(F, s.t, s.d, names('Finale shot', 12), { fast: true })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Santa Monica pier at sunset', { kb: 'in' })
  caption(F, s.t + 0.8, s.d - 1.6, 'Two weeks, one car, the whole country.')
  s = F.scene(2)
  bigStatement(F, s.t, s.d, 'END OF THE ROAD', { label: 'Pacific Ocean · finish line' })
  // Outro (84–92)
  s = F.scene(4)
  credits(F, s.t, s.d, { heading: 'ROAD TRIP DIARY', lines: ['DRIVER', 'Your Name', '', 'NAVIGATOR', 'Your Name', '', 'MUSIC', 'Open Road · Trailhead original'] })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Thanks for riding along', sub: 'roadtrip.example', handle: '@yourhandle' })

  b.audioTrack('Music · Open Road (Trailhead original)')
  b.music('music-open-road', { fromBar: 32, fadeIn: 1.5, fadeOut: F.at(4) })
  return b.done()
}

// =============================================================================================
// 6. Backpacker vlog — 3:08, 9:16, Trailhead from bar 24 (88 bars)
// =============================================================================================
const PACK_BARS = 88
function packCity(F: Film, n: number, o: { name: string; country: string; coords: string; labels: [string, string, string]; line: string; sub: string }, extra: 'reel' | 'polaroid') {
  const { b } = F
  let s = F.scene(2)
  b.marker(s.t, `0${n} · ${o.name}`, F.S.accent)
  chapterCard(F, s.t, s.d, { num: `0${n}`, title: o.name, sub: o.country, over: true, label: `${o.name} · skyline` })
  s = F.scene(6)
  shots(F, s.t, s.d, o.labels)
  locationTag(F, s.t + 0.8, F.at(1.8), o.name.toUpperCase(), o.coords)
  lowerThird(F, s.t + F.at(2.3), F.at(2.8), { title: o.line, sub: o.sub, tag: `0${n}` })
  void extra
}

function backpacker(): Project {
  const bpm = trackById('music-trailhead')!.bpm
  const dur = barsDuration('music-trailhead', PACK_BARS)
  const b = new TemplateBuilder('Backpacker vlog · 3:08', '9:16', dur, '#0b0f14')
  const F = new Film(b, PACK, bpm)
  vignette(F, dur, 0.36)
  progress(F, dur)

  // Build (0–8) — the hook
  let s = F.scene(3)
  shot(F, s.t, s.d, 'Hook · pack on my back', { kb: 'in', tr: null })
  caption(F, s.t + 0.8, s.d - 1.6, '5 countries. 1 backpack. 30 days.')
  s = F.scene(5)
  b.marker(s.t, 'Title', PACK.accent)
  titleCard(F, s.t, s.d, { kicker: '30 DAYS · 1 BACKPACK', title: 'BACKPACKING SOUTHEAST ASIA', subtitle: 'The full trip in three minutes' })
  // Chorus (8–24) — Bangkok
  packCity(F, 1, { name: 'Bangkok', country: 'THAILAND', coords: '13.76° N · 100.50° E', labels: ['Tuk-tuk at night', 'Street food stall', 'Temple at dawn'], line: 'Street food at 2 a.m.', sub: 'Pad kra pao for $1.50' }, 'reel')
  s = F.scene(4)
  b.marker(s.t, 'Reel', PACK.accent)
  shots(F, s.t, s.d, names('Bangkok reel', 8), { fast: true })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Market', 'Canal boat', 'Rooftop'])
  // Verse 2 (24–40) — Luang Prabang
  s = F.scene(2)
  b.marker(s.t, '02 · Luang Prabang', PACK.accent)
  chapterCard(F, s.t, s.d, { num: '02', title: 'Luang Prabang', sub: 'LAOS', over: true, label: 'Mekong at sunrise' })
  s = F.scene(6)
  shots(F, s.t, s.d, ['Alms giving at dawn', 'Kuang Si falls', 'Night market'])
  caption(F, s.t + 0.8, F.at(1.8), 'The slowest, softest stop.')
  caption(F, s.t + F.at(2.3), F.at(1.8), 'I could have stayed a month.')
  s = F.scene(2)
  polaroid(F, s.t, s.d, { label: 'Waterfall swim', caption: 'turquoise everything', date: 'DAY 09', side: 'left', rot: -3, paper: '#101722', ink: '#f5f1e6' })
  s = F.scene(2)
  polaroid(F, s.t, s.d, { label: 'Night market', caption: 'lanterns and sticky rice', date: 'DAY 10', side: 'right', rot: 3, paper: '#101722', ink: '#f5f1e6' })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Slow boat down the Mekong', { kb: 'right' })
  lowerThird(F, s.t + 0.8, s.d - 1.8, { title: 'Slow boat to nowhere', sub: '6 hours, no wifi', tag: '02' })
  // Bridge (40–56) — Hanoi
  s = F.scene(4)
  b.marker(s.t, 'Interlude', '#9aa5c4')
  quote(F, s.t, s.d, { text: 'The world is a book, and those who do not travel read only one page.', author: '— SAINT AUGUSTINE', bg: PACK.dark })
  s = F.scene(2)
  b.marker(s.t, '03 · Hanoi', PACK.accent)
  chapterCard(F, s.t, s.d, { num: '03', title: 'Hanoi', sub: 'VIETNAM', over: true, label: 'Old Quarter at dusk' })
  s = F.scene(6)
  shots(F, s.t, s.d, ['Scooter river', 'Egg coffee', 'Train Street'])
  locationTag(F, s.t + 0.8, F.at(1.8), 'HANOI', '21.03° N · 105.85° E')
  caption(F, s.t + F.at(2.3), F.at(2.8), 'Cross the road like you mean it.')
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '4,200 km', label: 'TRAVELLED' }, { value: '12 buses', label: 'AND 3 TRAINS' }, { value: '$38 / day', label: 'AVERAGE SPEND' }], { label: 'Stats backdrop · rice fields' })
  // Build 2 (56–64)
  s = F.scene(8)
  b.marker(s.t, 'Almost there', '#e3a05a')
  shots(F, s.t, s.d, names('Reel moment', 16), { fast: true })
  // Final chorus (64–80) — Bali
  s = F.scene(2)
  b.marker(s.t, '04 · Bali', PACK.accent)
  chapterCard(F, s.t, s.d, { num: '04', title: 'Bali', sub: 'INDONESIA', over: true, label: 'Rice terraces at sunrise' })
  s = F.scene(6)
  shots(F, s.t, s.d, ['Rice terrace swing', 'Scooter on the coast', 'Temple at sunset'])
  lowerThird(F, s.t + F.at(2.3), F.at(2.8), { title: 'Sunrise at Tegallalang', sub: 'Worth the 4 a.m. alarm', tag: '04' })
  s = F.scene(4)
  shots(F, s.t, s.d, names('Bali reel', 8), { fast: true })
  s = F.scene(4)
  bigStatement(F, s.t, s.d, 'WORTH IT', { sub: '30 DAYS · 5 COUNTRIES', label: 'Last sunset' })
  // Outro (80–88)
  s = F.scene(4)
  b.marker(s.t, 'Credits', '#a3a7b3')
  credits(F, s.t, s.d, { heading: 'BACKPACKING SOUTHEAST ASIA', lines: ['FILMED BY', 'Your Name', '', 'MUSIC', 'Trailhead · Trailhead original', '', 'FOLLOW THE NEXT TRIP', '@yourhandle'] })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Where next?', sub: 'Drop your pick in the comments', handle: '@yourhandle' })

  b.audioTrack('Music · Trailhead (Trailhead original)')
  b.music('music-trailhead', { fromBar: 24, fadeIn: 1, fadeOut: F.at(4) })
  return b.done()
}

// =============================================================================================
// 7. City break weekend — 2:00, 9:16, Open Road from bar 16 (62 bars)
// =============================================================================================
const CITY_BARS = 62
function spot(F: Film, n: number, o: { kind: string; name: string; note: string; label: string }) {
  let s = F.scene(4)
  shot(F, s.t, s.d, o.label, { kb: (['in', 'right', 'out', 'left'] as const)[n % 4] })
  dayChip(F, s.t + 0.3, s.d - 0.8, `${String(n).padStart(2, '0')} · ${o.kind}`)
  lowerThird(F, s.t + 0.6, s.d - 1.4, { title: o.name, sub: o.note })
  void s
}

function cityBreak(): Project {
  const bpm = trackById('music-open-road')!.bpm
  const dur = barsDuration('music-open-road', CITY_BARS)
  const b = new TemplateBuilder('City break weekend · 2:00', '9:16', dur, '#0c0e1a')
  const F = new Film(b, CITY, bpm)
  vignette(F, dur, 0.36)
  progress(F, dur)

  let s = F.scene(4)
  b.marker(s.t, 'Title', CITY.accent)
  titleCard(F, s.t, s.d, { kicker: 'CITY BREAK GUIDE', title: 'LISBON IN 48 HOURS', subtitle: 'where to eat · what to see', tr: null })
  b.marker(F.time, 'Day 1', CITY.accent)
  spot(F, 1, { kind: 'EAT', name: 'Time Out Market', note: 'Twelve kitchens, one long table', label: 'Time Out Market · food hall' })
  spot(F, 2, { kind: 'SEE', name: 'Alfama at golden hour', note: 'Climb to Miradouro das Portas do Sol', label: 'Alfama rooftops' })
  spot(F, 3, { kind: 'DO', name: 'Tram 28', note: 'Go early, hold on tight', label: 'Tram 28 on a cobbled hill' })
  s = F.scene(4)
  b.marker(s.t, 'Interlude', '#9aa5c4')
  quote(F, s.t, s.d, { text: 'Travel is the only thing you buy that makes you richer.', author: '— ANONYMOUS', bg: CITY.dark })
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Pastel de nata', caption: 'warm, always warm', date: 'DAY 01', side: 'left', rot: -3, paper: '#101424', ink: '#f2eee6' })
  s = F.scene(8)
  b.marker(s.t, 'Speed round', '#e3a05a')
  shots(F, s.t, s.d, names('City moment', 16), { fast: true })
  b.marker(F.time, 'Day 2', CITY.accent)
  spot(F, 4, { kind: 'SEE', name: 'Belém Tower', note: 'Gothic, riverside and free to admire', label: 'Belém Tower at sunrise' })
  spot(F, 5, { kind: 'EAT', name: 'Pastéis de Belém', note: 'The original recipe since 1837', label: 'Pastéis de Belém queue' })
  spot(F, 6, { kind: 'DO', name: 'LX Factory', note: 'Bookshops, murals and espresso', label: 'LX Factory street art' })
  spot(F, 7, { kind: 'SEE', name: 'Sunset at Miradouro', note: 'Bring wine, arrive early', label: 'Miradouro da Graça' })
  s = F.scene(4)
  b.marker(s.t, 'Highlights', CITY.accent)
  shots(F, s.t, s.d, ['Rooftop view', 'Tile facades'])
  caption(F, s.t + 0.8, s.d - 1.8, 'Forty-eight hours is never enough.')
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Sunset wine', caption: 'last light over the Tagus', date: 'DAY 02', side: 'right', rot: 3, paper: '#101424', ink: '#f2eee6' })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '48 h', label: 'IN LISBON' }, { value: '7', label: 'COFFEES' }, { value: '21,340', label: 'STEPS' }], { label: 'Stats backdrop · rooftops' })
  s = F.scene(2)
  endCard(F, s.t, s.d, { title: 'Save this guide', sub: 'More city breaks on the channel', handle: '@yourhandle' })

  b.audioTrack('Music · Open Road (Trailhead original)')
  b.music('music-open-road', { fromBar: 16, fadeIn: 0.5, fadeOut: F.at(3) })
  return b.done()
}

// =============================================================================================
// 8. Beach sunset escape — 2:17, 9:16, Golden Hour from bar 36 (48 bars)
// =============================================================================================
const BEACH_BARS = 48
function beachEscape(): Project {
  const bpm = trackById('music-golden-hour')!.bpm
  const dur = barsDuration('music-golden-hour', BEACH_BARS)
  const b = new TemplateBuilder('Beach sunset escape · 2:17', '9:16', dur, '#1b1230')
  const F = new Film(b, BEACH, bpm)
  vignette(F, dur, 0.3)
  progress(F, dur)

  let s = F.scene(4)
  b.marker(s.t, 'Title', BEACH.accent)
  titleCard(F, s.t, s.d, { kicker: 'BEACH ESCAPE', title: 'GOLDEN HOUR', subtitle: 'Algarve · Portugal', tr: null })
  s = F.scene(3)
  shot(F, s.t, s.d, 'Cliffs above the sea', { kb: 'in' })
  locationTag(F, s.t + 0.8, s.d - 1.6, 'LAGOS', '37.10° N · 8.67° W')
  s = F.scene(3)
  shot(F, s.t, s.d, 'Waves on warm sand', { kb: 'right' })
  caption(F, s.t + 0.8, s.d - 1.8, 'Barefoot for a week.')
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Beach picnic', caption: 'salt in our hair', date: 'DAY 02', side: 'left', rot: -3, paper: '#241a3a', ink: '#f6ece4' })
  s = F.scene(3)
  shots(F, s.t, s.d, ['Sea caves by kayak', 'Sunset swim'])
  lowerThird(F, s.t + 0.8, s.d - 1.6, { title: 'Ponta da Piedade', sub: 'Kayaks, caves and clear water', tag: 'DAY 03' })

  s = F.scene(4)
  b.marker(s.t, 'Interlude', '#9aa5c4')
  quote(F, s.t, s.d, { text: 'The cure for anything is salt water: sweat, tears or the sea.', author: '— ISAK DINESEN', bg: BEACH.dark })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Slow sunset over the ocean', { kb: 'out' })
  caption(F, s.t + 1, s.d - 2.2, 'Some days are just for the horizon.')

  s = F.scene(4)
  b.marker(s.t, 'Golden hour', BEACH.accent)
  shots(F, s.t, s.d, ['Beach walk', 'Sunset glow'])
  locationTag(F, s.t + 0.8, s.d - 1.8, 'PRAIA DO CAMILO', '37.09° N · 8.67° W')
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Golden hour portrait', caption: 'last light, best light', date: 'DAY 05', side: 'right', rot: 3, paper: '#241a3a', ink: '#f6ece4' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Shells', 'Salt hair', 'Sunset sky'])
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '7 days', label: 'BAREFOOT' }, { value: '14', label: 'SUNSETS' }, { value: '1', label: 'SUNBURN' }], { label: 'Stats backdrop · beach panorama' })

  s = F.scene(4)
  bigStatement(F, s.t, s.d, 'SALT & SUN', { sub: 'SEE YOU NEXT SUMMER', label: 'Closing sunset' })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Take me back', sub: 'Algarve, Portugal', handle: '@yourhandle' })

  b.audioTrack('Music · Golden Hour (Trailhead original)')
  b.music('music-golden-hour', { fromBar: 36, fadeIn: 1.5, fadeOut: F.at(4) })
  return b.done()
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

export const ADVENTURE_TEMPLATES: TemplateDef[] = [
  { id: 'epic-adventure-film', name: 'Epic adventure film', description: `Four-chapter expedition film (${fmt(barsDuration('music-summit', EPIC_BARS))}): cold open, title, chapters, build, summit, credits. Letterbox, subtitles, quotes and stats, cut to Summit.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-summit', EPIC_BARS), previewTime: 19.6, music: 'Summit', build: epicFilm },
  { id: 'island-hopping-journal', name: 'Island hopping journal', description: `Four islands, polaroid pages, place tags and sunset captions (${fmt(barsDuration('music-golden-hour', ISLAND_BARS))}) with the warm Golden Hour track.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-golden-hour', ISLAND_BARS), previewTime: 4.8, music: 'Golden Hour', build: islandHopping },
  { id: 'road-trip-diary', name: 'Road trip diary', description: `Day-by-day route diary (${fmt(barsDuration('music-open-road', ROAD_BARS))}) with day counters, location tags, postcards and a stats finale, cut to Open Road.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-open-road', ROAD_BARS), previewTime: 3.9, music: 'Open Road', build: roadTrip },
  { id: 'wild-trails-camping', name: 'Wild trails & camping', description: `Trailhead to campfire to stars (${fmt(barsDuration('music-trailhead', WILD_BARS))}): ridge views, polaroids, night skies and a quiet bridge, aligned to Trailhead.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-trailhead', WILD_BARS), previewTime: 9.2, music: 'Trailhead', build: wildTrails },
  { id: 'around-the-world-recap', name: 'Around the world · year recap', description: `Twelve months in four quarters (${fmt(barsDuration('music-trailhead', YEAR_BARS))}): twelve destinations, fast montages and stats per quarter, with Trailhead.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-trailhead', YEAR_BARS), previewTime: 12.4, music: 'Trailhead', build: yearRecap },
  { id: 'backpacker-vlog', name: 'Backpacker vlog', description: `Vertical multi-country vlog (${fmt(barsDuration('music-trailhead', PACK_BARS))}): hook, city chapters, story captions, quotes and fast reels.`, category: 'travel', aspect: '9:16', duration: barsDuration('music-trailhead', PACK_BARS), previewTime: 7.2, music: 'Trailhead', build: backpacker },
  { id: 'city-break-weekend', name: 'City break weekend', description: `Vertical city guide (${fmt(barsDuration('music-open-road', CITY_BARS))}): numbered EAT / SEE / DO spots, postcards, a speed round and stats, to Open Road.`, category: 'travel', aspect: '9:16', duration: barsDuration('music-open-road', CITY_BARS), previewTime: 12, music: 'Open Road', build: cityBreak },
  { id: 'beach-sunset-escape', name: 'Beach sunset escape', description: `Calm vertical beach diary (${fmt(barsDuration('music-golden-hour', BEACH_BARS))}): golden-hour shots, polaroids, a quote and a soft sign-off with Golden Hour.`, category: 'travel', aspect: '9:16', duration: barsDuration('music-golden-hour', BEACH_BARS), previewTime: 6, music: 'Golden Hour', build: beachEscape },
]
