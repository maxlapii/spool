/**
 * 16:9 templates built around the mood tracks (Drift, Boom Bap, Plot Twist, Good Vibes). Each film is
 * storyboarded in whole bars of its track, starting at a chosen bar (`fromBar`), so titles, cuts and
 * reveals land on the beat. Plot Twist's two "stop" bars (full silence) get a matching black "?" frame.
 * Everything is editable: footage frames are placeholders for the user's own clips, text is real text.
 */
import type { Project } from '@/types'
import type { TemplateDef } from './travel'
import { TemplateBuilder } from './helpers'
import {
  bigStatement, caption, chapterCard, endCard, Film, locationTag, lowerThird, polaroid, progress, quote, shot, shots, stats, titleCard, triptych, vignette,
  type Style,
} from './scenes'
import { barSeconds, trackById } from './samples'

const barsDuration = (trackId: string, bars: number) => Math.ceil(barSeconds(trackById(trackId)!) * bars * 100) / 100
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

const CALM: Style = { heading: 'Playfair Display', script: 'DM Serif Display', sans: 'Inter', accent: '#3ecfaf', ink: '#ffffff', mute: 'rgba(255,255,255,0.8)', dark: '#10201f', tones: ['#6aa7b0', '#8fb89c', '#a6b4cf', '#c9b89a', '#7f9fa8', '#9cb5a0'] }

/** Every scene claims whole bars; fail loudly if a storyboard does not add up to the film length. */
function checkBars(F: Film, bars: number, name: string) {
  if (Math.abs(F.time - F.at(bars)) > 1e-6) throw new Error(`${name}: storyboard is ${F.time / F.bar} bars, expected ${bars}`)
}

// =============================================================================================
// CHILL · Drift (72 BPM, 72 bars = 4:00)
// =============================================================================================
const JOURNAL_BARS = 72
function slowJournal(): Project {
  const dur = barsDuration('music-drift', JOURNAL_BARS)
  const b = new TemplateBuilder('Slow travel journal · 4 min', '16:9', dur, '#10201f')
  const F = new Film(b, CALM, 72)
  vignette(F, dur, 0.4)
  progress(F, dur)
  const acc = CALM.accent

  let s = F.scene(4)
  b.marker(s.t, 'Title', acc)
  titleCard(F, s.t, s.d, { kicker: 'A TRAVEL JOURNAL', title: 'Slow Travel', subtitle: 'Three days in no hurry', tr: null })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Morning light on the water', { kb: 'in' })
  caption(F, s.t + F.at(0.4), F.at(1.6), 'Today there is nowhere to be.')
  caption(F, s.t + F.at(2.2), F.at(1.6), 'Only somewhere to arrive, slowly.')

  s = F.scene(4)
  b.marker(s.t, 'Mornings', acc)
  chapterCard(F, s.t, s.d, { num: 'I', title: 'Mornings', sub: 'SLOW COFFEE · SOFT LIGHT', over: true, label: 'Chapter I · sunrise over the rooftops' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Coffee on the balcony', 'Market stalls opening'])
  locationTag(F, s.t + 1, s.d - 1.8, 'OLD TOWN', 'Before the crowds')
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Breakfast table', caption: 'bread, honey, no plans', date: 'DAY 01', side: 'left', rot: -3, paper: '#142928', ink: '#eaf6f2' })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Walking the harbour', { kb: 'right' })
  caption(F, s.t + F.at(0.4), F.at(1.6), 'The best maps are the ones you fold away.')
  caption(F, s.t + F.at(2.2), F.at(1.6), 'We followed the smell of bread.')

  s = F.scene(4)
  b.marker(s.t, 'Afternoons', acc)
  chapterCard(F, s.t, s.d, { num: 'II', title: 'Afternoons', sub: 'SHADE · SALT · SIESTA', over: true, label: 'Chapter II · terrace at midday' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Tiles in the sun', 'Hammock shade', 'Cold lemonade'])
  s = F.scene(4)
  shots(F, s.t, s.d, ['Cliff path', 'Quiet cove', 'Swim'])
  lowerThird(F, s.t + 1, s.d - 1.8, { title: 'The hidden cove', sub: 'Twenty minutes on foot, worth every one', tag: 'DAY 02' })
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'Not all those who wander are lost.', author: '— J.R.R. TOLKIEN', bg: CALM.dark })

  s = F.scene(4)
  b.marker(s.t, 'Slow down', '#9aa5c4')
  bigStatement(F, s.t, s.d, 'SLOW DOWN', { sub: 'THE VIEW WILL WAIT', label: 'Interlude · water at rest' })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Clouds over the bay', { kb: 'out' })
  caption(F, s.t + F.at(0.5), F.at(3), 'Some days the whole plan is a window seat.')

  s = F.scene(4)
  b.marker(s.t, 'Evenings', acc)
  chapterCard(F, s.t, s.d, { num: 'III', title: 'Evenings', sub: 'GOLDEN LIGHT · LONG TABLES', over: true, label: 'Chapter III · sunset from the terrace' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Harbour lights', 'Dinner by candle'])
  locationTag(F, s.t + 1, s.d - 1.8, 'THE WATERFRONT', 'Golden hour')
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Last light', caption: 'we stayed for the afterglow', date: 'DAY 03', side: 'right', rot: 3, paper: '#142928', ink: '#eaf6f2' })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '3 days', label: 'NO ALARMS' }, { value: '11', label: 'COFFEES' }, { value: '1', label: 'PERFECT SUNSET' }], { label: 'Stats backdrop · evening sea' })

  s = F.scene(4)
  b.marker(s.t, 'Outro', '#a3a7b3')
  bigStatement(F, s.t, s.d, 'STAY A LITTLE LONGER', { sub: 'THERE IS NO RUSH', label: 'Closing shot · empty beach at dusk' })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Until the next slow morning', sub: 'Your destination', handle: '@yourhandle' })
  checkBars(F, JOURNAL_BARS, 'slowJournal')

  b.audioTrack('Music · Drift')
  b.music('music-drift', { fadeIn: 2, fadeOut: F.at(3) })
  return b.done()
}

export const MOOD_TEMPLATES: TemplateDef[] = [
  { id: 'slow-travel-journal', name: 'Slow travel journal', description: `Chill, unhurried diary (${fmt(barsDuration('music-drift', JOURNAL_BARS))}): three parts, polaroids, quotes and soft captions, paced to Drift.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-drift', JOURNAL_BARS), previewTime: 6.5, music: 'Drift', build: slowJournal },
]
