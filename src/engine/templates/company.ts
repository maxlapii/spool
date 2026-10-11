/**
 * An original 3-minute company trip recap, storyboarded in 75 whole bars of Good Vibes (100 BPM = exactly 3:00) so
 * titles, chapters and cuts land on the beat. Footage frames are placeholders for your own clips; all text is real,
 * editable text.
 */
import type { Project } from '@/types'
import type { TemplateDef } from './travel'
import { TemplateBuilder } from './helpers'
import {
  bigStatement, caption, chapterCard, credits, endCard, Film, locationTag, lowerThird, polaroid, progress, quote, shot, shots, stats, titleCard, triptych, vignette,
  type Style,
} from './scenes'
import { barSeconds, trackById } from './samples'

const COMPANY_BARS = 75
const companyDuration = () => Math.ceil(barSeconds(trackById('music-good-vibes')!) * COMPANY_BARS * 100) / 100

const TEAM: Style = {
  heading: 'Poppins', script: 'DM Serif Display', sans: 'Inter', accent: '#ffc233', ink: '#ffffff', mute: 'rgba(255,255,255,0.85)', dark: '#0f1b3d',
  tones: ['#3a8df7', '#38b2ac', '#f59e0b', '#7c5cf0', '#ef6a5b', '#4ca36d'],
}

function companyTrip(): Project {
  const dur = companyDuration()
  const b = new TemplateBuilder('Company trip recap · 3 min', '16:9', dur, TEAM.dark)
  const F = new Film(b, TEAM, 100)
  vignette(F, dur, 0.3)
  progress(F, dur)
  const acc = TEAM.accent

  let s = F.scene(4)
  b.marker(s.t, 'Title', acc)
  titleCard(F, s.t, s.d, { kicker: 'TEAM RECAP', title: 'Company Trip', subtitle: 'Your company · Your year', tr: null })
  s = F.scene(3)
  shot(F, s.t, s.d, 'Group shot · the whole team', { kb: 'in' })
  caption(F, s.t + F.at(0.3), F.at(2.4), 'Three days. One team.')

  s = F.scene(4)
  b.marker(s.t, 'Day 1', '#3a8df7')
  chapterCard(F, s.t, s.d, { num: '01', title: 'Arrival', sub: 'TRAVEL · CHECK-IN · WELCOME', over: true, label: 'Chapter 01 · coach pulling up' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Travelling together', 'Check-in', 'Welcome drinks'])
  locationTag(F, s.t + 1, s.d - 1.8, 'YOUR DESTINATION', 'Day 1')
  s = F.scene(3)
  shot(F, s.t, s.d, 'Team leader welcoming everyone', { kb: 'left' })
  lowerThird(F, s.t + 0.6, s.d - 1.2, { title: 'Your name', sub: 'Welcome to the trip', tag: 'DAY 1' })
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'First team photo', caption: 'everyone made it', date: 'DAY 01', side: 'left', rot: -3, paper: '#16254d', ink: '#ffffff' })

  s = F.scene(4)
  b.marker(s.t, 'Day 2', '#38b2ac')
  chapterCard(F, s.t, s.d, { num: '02', title: 'Adventure', sub: 'OUTDOOR GAMES · TEAM CHALLENGES', over: true, label: 'Chapter 02 · morning outdoors' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Team game 1', 'Team game 2', 'Team game 3'], { fast: true })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '100', label: 'TEAMMATES' }, { value: '8', label: 'TEAM GAMES' }, { value: '1', label: 'TROPHY' }], { label: 'Stats backdrop · wide landscape' })
  s = F.scene(3)
  triptych(F, s.t, s.d, ['Team huddle', 'High five', 'Winning moment'])
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'Great things are done by a team.', author: '— YOUR LEADER', bg: TEAM.dark })

  s = F.scene(4)
  b.marker(s.t, 'Day 3', '#7c5cf0')
  chapterCard(F, s.t, s.d, { num: '03', title: 'Gala night', sub: 'DINNER · AWARDS · DANCE FLOOR', over: true, label: 'Chapter 03 · venue entrance' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Gala dinner', 'Awards on stage', 'Cheering table'])
  s = F.scene(3)
  polaroid(F, s.t, s.d, { label: 'Dressed up', caption: 'best team ever', date: 'DAY 03', side: 'right', rot: 3, paper: '#16254d', ink: '#ffffff' })
  s = F.scene(4)
  b.marker(s.t, 'Party', '#ef6a5b')
  bigStatement(F, s.t, s.d, 'ONE TEAM', { sub: 'ONE UNFORGETTABLE TRIP', label: 'Interlude · crowd with hands up' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Karaoke', 'Dance floor', 'Finale'], { fast: true })

  s = F.scene(4)
  b.marker(s.t, 'Credits', '#f59e0b')
  credits(F, s.t, s.d, { heading: 'THE TEAM', lines: ['Organisers · Your Name', 'Photography · Your Name', 'Video · Your Name', 'And all of you'] })
  s = F.scene(3)
  shot(F, s.t, s.d, 'Group photo · everyone in frame', { kb: 'out' })
  caption(F, s.t + F.at(0.3), F.at(2.4), 'Until next year.')
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Favourite moment 1', 'Favourite moment 2', 'Favourite moment 3'])
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Thank you, team', sub: 'See you on the next trip', handle: '@yourcompany' })
  if (Math.abs(F.time - F.at(COMPANY_BARS)) > 1e-6) throw new Error(`companyTrip: storyboard is ${F.time / F.bar} bars, expected ${COMPANY_BARS}`)

  b.audioTrack('Music · Good Vibes')
  b.music('music-good-vibes', { fadeIn: 1.5, fadeOut: F.at(3) })
  return b.done()
}

export const COMPANY_TEMPLATES: TemplateDef[] = [
  { id: 'company-trip-recap', name: 'Company trip recap', description: 'Three-minute team trip recap (3:00): title, three day chapters, team games, stats, gala night, credits and a thank-you, cut to Good Vibes. Replace the placeholders with your clips.', category: 'travel', aspect: '16:9', duration: companyDuration(), previewTime: 13, music: 'Good Vibes', build: companyTrip },
]
