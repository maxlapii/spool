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
  bigStatement, bigWord, caption, chapterCard, dayChip, endCard, Film, locationTag, lowerThird, lyric, polaroid, progress, quote, shot, shots, stats, titleCard, triptych, vignette,
  type Style,
} from './scenes'
import { barSeconds, trackById } from './samples'

const barsDuration = (trackId: string, bars: number) => Math.ceil(barSeconds(trackById(trackId)!) * bars * 100) / 100
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

const CALM: Style = { heading: 'Playfair Display', script: 'DM Serif Display', sans: 'Inter', accent: '#3ecfaf', ink: '#ffffff', mute: 'rgba(255,255,255,0.8)', dark: '#10201f', tones: ['#6aa7b0', '#8fb89c', '#a6b4cf', '#c9b89a', '#7f9fa8', '#9cb5a0'] }
const HIP: Style = { heading: 'Space Grotesk', script: 'DM Serif Display', sans: 'Space Grotesk', accent: '#ff6a2b', ink: '#ffffff', mute: 'rgba(255,255,255,0.8)', dark: '#0e0e12', tones: ['#5a6bd6', '#d6633a', '#46a6b0', '#9a5bf5', '#d6a33a', '#3a8df7'] }
const TWIST: Style = { heading: 'Poppins', script: 'DM Serif Display', sans: 'Poppins', accent: '#ffd23f', ink: '#ffffff', mute: 'rgba(255,255,255,0.85)', dark: '#150f28', tones: ['#9a5bf5', '#3ecfaf', '#ff6a2b', '#3a8df7', '#e0508a', '#7fb069'] }
const VIBES: Style = { heading: 'Poppins', script: 'DM Serif Display', sans: 'Plus Jakarta Sans', accent: '#ffb43a', ink: '#ffffff', mute: 'rgba(255,255,255,0.88)', dark: '#102a43', tones: ['#3a8df7', '#ff8a5b', '#3ecfaf', '#ffcf5c', '#e0508a', '#7a6cf0'] }

/** Every scene claims whole bars; fail loudly if a storyboard does not add up to the film length. */
function checkBars(F: Film, bars: number, name: string) {
  if (Math.abs(F.time - F.at(bars)) > 1e-6) throw new Error(`${name}: storyboard is ${F.time / F.bar} bars, expected ${bars}`)
}

/** A run of crisp beat cuts (one shot per `each` bars). */
function beatCuts(F: Film, bars: number, labels: string[], o: { tag?: [string, string?] } = {}) {
  const s = F.scene(bars)
  shots(F, s.t, s.d, labels, { fast: true })
  if (o.tag) locationTag(F, s.t + 0.6, Math.min(s.d - 1, F.at(2)), o.tag[0], o.tag[1])
  return s
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

const RETREAT_BARS = 24
const RETREAT_FROM = 24
function morningRetreat(): Project {
  const dur = barsDuration('music-drift', RETREAT_BARS)
  const b = new TemplateBuilder('Morning retreat · 1:20', '16:9', dur, '#10201f')
  const F = new Film(b, CALM, 72)
  vignette(F, dur, 0.35)

  let s = F.scene(4)
  b.marker(s.t, 'Title', CALM.accent)
  titleCard(F, s.t, s.d, { kicker: 'MORNING RETREAT', title: 'Breathe In', subtitle: 'Slow down. Begin again.', tr: null })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Sunrise over the mountains', { kb: 'in' })
  caption(F, s.t + F.at(0.6), F.at(3), 'Start where you are.')
  s = F.scene(4)
  shots(F, s.t, s.d, ['Yoga on the deck', 'Forest walk'])
  locationTag(F, s.t + 1, s.d - 1.8, 'THE RETREAT', 'Pine valley')
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Tea ritual', caption: 'warm hands, quiet mind', date: '07:00', side: 'left', rot: -3, paper: '#142928', ink: '#eaf6f2' })
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'Nature does not hurry, yet everything is accomplished.', author: '— LAO TZU', bg: CALM.dark })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Come back to calm', sub: 'Book your retreat', handle: 'retreat.example' })
  checkBars(F, RETREAT_BARS, 'morningRetreat')

  b.audioTrack('Music · Drift')
  b.music('music-drift', { fromBar: RETREAT_FROM, fadeIn: 1.5, fadeOut: F.at(3) })
  return b.done()
}

// =============================================================================================
// HIP · Boom Bap (90 BPM)
// =============================================================================================
const LOOKBOOK_BARS = 80
function urbanLookbook(): Project {
  const dur = barsDuration('music-boom-bap', LOOKBOOK_BARS)
  const b = new TemplateBuilder('Night shift lookbook · 3:33', '16:9', dur, '#0e0e12')
  const F = new Film(b, HIP, 90)
  vignette(F, dur, 0.35)
  progress(F, dur)
  const acc = HIP.accent

  let s = F.scene(4)
  b.marker(s.t, 'Title', acc)
  titleCard(F, s.t, s.d, { kicker: 'CITY SESSIONS', title: 'NIGHT SHIFT', subtitle: 'A lookbook after dark', tr: null })
  beatCuts(F, 4, ['Neon crossing', 'Subway steps', 'Rooftop view', 'Alley light'], { tag: ['DOWNTOWN', 'After 10 pm'] })
  s = F.scene(4)
  shot(F, s.t, s.d, 'The block', { kb: 'left' })
  lowerThird(F, s.t + 0.8, s.d - 1.4, { title: 'The Block', sub: 'Where the night starts', tag: 'SPOT 01' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Sneakers', 'Skyline', 'Street art'])
  s = F.scene(2)
  bigWord(F, s.t, s.d, 'CITY NEVER SLEEPS', { bg: acc, color: '#0e0e12', subColor: '#0e0e12' })
  s = F.scene(2)
  shots(F, s.t, s.d, ['Crosswalk', 'Taxi glow'], { fast: true })

  s = F.scene(4)
  b.marker(s.t, 'Spot 02', '#3a8df7')
  chapterCard(F, s.t, s.d, { num: '02', title: 'Street canvas', sub: 'MURALS · TAGS · PAPER', over: true, label: 'Spot 02 · mural wall' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Mural close-up', 'Spray detail', 'Artist at work'])
  locationTag(F, s.t + 0.8, s.d - 1.4, 'ARTS DISTRICT')
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '12', label: 'MURALS' }, { value: '4 km', label: 'ON FOOT' }, { value: '1 am', label: 'LAST CALL' }], { label: 'Stats backdrop · city skyline' })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Window seat on the night bus', { kb: 'out' })
  caption(F, s.t + F.at(0.5), F.at(1.5), 'Every light has a story.')
  caption(F, s.t + F.at(2.3), F.at(1.5), 'We just keep walking.')

  s = F.scene(8)
  b.marker(s.t, 'Hook', acc)
  shots(F, s.t, s.d, ['Hook 01 · crowd', 'Hook 02 · lights', 'Hook 03 · feet', 'Hook 04 · skyline', 'Hook 05 · neon', 'Hook 06 · steam', 'Hook 07 · rooftop', 'Hook 08 · taxi'], { fast: true })
  locationTag(F, s.t + 0.6, F.at(3), 'MIDTOWN', 'Rush hour')
  s = F.scene(4)
  b.marker(s.t, 'Break', '#9aa5c4')
  quote(F, s.t, s.d, { text: 'The city is a canvas. The night is the paint.', author: '— YOUR NAME', bg: HIP.dark })

  s = F.scene(4)
  b.marker(s.t, 'Spot 03', '#46a6b0')
  polaroid(F, s.t, s.d, { label: 'Corner store', caption: 'late-night snacks', date: '01:12', side: 'left', rot: -3, paper: '#1a1a22', ink: '#f2f2f6' })
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Rooftop crew', caption: 'the whole block', date: '02:30', side: 'right', rot: 3, paper: '#1a1a22', ink: '#f2f2f6' })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Subway platform', 'Last train'])
  lowerThird(F, s.t + 0.8, s.d - 1.4, { title: 'Last Train Home', sub: 'Line 7 · 02:41', tag: 'SPOT 05' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Coffee steam', 'Wet asphalt', 'Dawn colour'])

  s = F.scene(8)
  b.marker(s.t, 'Hook 2', acc)
  shots(F, s.t, s.d, ['Finale 01 · bridge', 'Finale 02 · plaza', 'Finale 03 · crowd', 'Finale 04 · subway', 'Finale 05 · fireworks', 'Finale 06 · skyline', 'Finale 07 · dawn', 'Finale 08 · sunrise'], { fast: true })
  dayChip(F, s.t + 0.5, F.at(3), 'LAST NIGHT')
  s = F.scene(4)
  bigStatement(F, s.t, s.d, 'SEE YOU OUT THERE', { sub: 'SAME CORNER · SAME TIME', label: 'Closing shot · empty street at dawn' })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Night shift', sub: 'Season one · all cities', handle: '@yourhandle' })
  checkBars(F, LOOKBOOK_BARS, 'urbanLookbook')

  b.audioTrack('Music · Boom Bap')
  b.music('music-boom-bap', { fadeIn: 1, fadeOut: F.at(3) })
  return b.done()
}

const LYRIC_BARS = 32
const LYRIC_FROM = 36
function lyricVideo(): Project {
  const dur = barsDuration('music-boom-bap', LYRIC_BARS)
  const b = new TemplateBuilder('Beat lyric video · 1:25', '16:9', dur, '#0e0e12')
  const F = new Film(b, HIP, 90)
  vignette(F, dur, 0.4)
  progress(F, dur)

  let s = F.scene(2)
  b.marker(s.t, 'Title', HIP.accent)
  bigWord(F, s.t, s.d, 'YOUR SONG', { sub: 'ARTIST NAME · OFFICIAL LYRIC VIDEO', bg: HIP.dark })
  const verse: [string[], number][] = [
    [['WALKING THROUGH', 'THE CITY LIGHTS'], 1],
    [['EVERY STEP', 'ON THE BEAT'], 1],
    [['NOWHERE TO BE', 'EVERYWHERE'], 1],
  ]
  for (const [lines, hi] of verse) { s = F.scene(2); lyric(F, s.t, s.d, lines, { hi }) }
  s = F.scene(4)
  b.marker(s.t, 'Break', '#9aa5c4')
  lyric(F, s.t, s.d, ['SLOW IT DOWN', '...'], { hi: 1, label: 'Lyric background · slow footage' })
  const chorus: [string[], number][] = [
    [['WE KEEP MOVING', 'WE KEEP GOING'], 1],
    [['THE NIGHT IS OURS', 'THE STREETS ARE LOUD'], 0],
    [['HANDS UP HIGH', 'LET IT RING'], 1],
    [['ONE MORE SONG', 'ONE MORE ROUND'], 1],
    [['NEVER LOOK BACK', 'ONLY AHEAD'], 0],
    [['THIS IS OUR TIME', 'THIS IS OUR CITY'], 1],
    [['TURN IT UP', 'LET IT PLAY'], 0],
    [['WE ARE HERE', 'WE ARE NOW'], 1],
  ]
  chorus.forEach(([lines, hi], i) => { s = F.scene(2); if (i === 0) b.marker(s.t, 'Chorus', HIP.accent); lyric(F, s.t, s.d, lines, { hi }) })
  s = F.scene(4)
  b.marker(s.t, 'Outro', '#a3a7b3')
  bigWord(F, s.t, s.d, 'THANK YOU', { sub: 'LISTEN EVERYWHERE · @YOURHANDLE', bg: HIP.accent, color: '#0e0e12', subColor: '#0e0e12' })
  checkBars(F, LYRIC_BARS, 'lyricVideo')

  b.audioTrack('Music · Boom Bap')
  b.music('music-boom-bap', { fromBar: LYRIC_FROM, fadeIn: 0.4, fadeOut: F.at(3) })
  return b.done()
}

// =============================================================================================
// SURPRISE · Plot Twist (120 BPM, bar = 2 s). Stop bars are silent: abs bars 23, 55 (and 87).
// =============================================================================================
const REVEAL_BARS = 64
const REVEAL_FROM = 8
function tripReveal(): Project {
  const dur = barsDuration('music-plot-twist', REVEAL_BARS)
  const b = new TemplateBuilder('Surprise trip reveal · 2:08', '16:9', dur, '#150f28')
  const F = new Film(b, TWIST, 120)
  vignette(F, dur, 0.3)
  const acc = TWIST.accent
  const purple = '#9a5bf5'

  // Verse: the teaser (bars 0–7)
  let s = F.scene(4)
  b.marker(s.t, 'Teaser', purple)
  shot(F, s.t, s.d, 'Packed suitcases by the door', { kb: 'in', tr: null })
  dayChip(F, s.t + 0.4, F.at(3), 'TOP SECRET')
  caption(F, s.t + F.at(0.8), F.at(2.8), 'We have been keeping a secret.')
  s = F.scene(4)
  shot(F, s.t, s.d, 'Passport on the table', { kb: 'right' })
  caption(F, s.t + F.at(0.8), F.at(2.8), 'Can you guess where we are going?')

  // Build: clues (bars 8–14), then the stop bar (15)
  b.marker(F.time, 'Clues', '#3ecfaf')
  s = F.scene(2); bigWord(F, s.t, s.d, 'CLUE 1', { sub: 'IT IS WARM', bg: '#3ecfaf', color: '#0e1a2b', subColor: '#0e1a2b' })
  s = F.scene(2); bigWord(F, s.t, s.d, 'CLUE 2', { sub: 'MOUNTAINS AND SEA', bg: '#3a8df7' })
  s = F.scene(2); bigWord(F, s.t, s.d, 'CLUE 3', { sub: 'NO JACKETS REQUIRED', bg: '#e0508a' })
  s = F.scene(1); bigWord(F, s.t, s.d, 'READY?', { bg: purple })
  s = F.scene(1); bigWord(F, s.t, s.d, '?', { bg: '#000000', color: acc })

  // Chorus: the reveal (bars 16–31)
  s = F.scene(2)
  b.marker(s.t, 'The reveal', acc)
  bigWord(F, s.t, s.d, "WE'RE GOING TO", { bg: purple })
  s = F.scene(2); bigWord(F, s.t, s.d, 'BALI!', { sub: 'INDONESIA · JUNE', bg: acc, color: '#150f28', subColor: '#150f28' })
  beatCuts(F, 8, ['Rice terraces', 'Temple at dawn', 'Beach swing', 'Night market'], { tag: ['UBUD', 'Day 3'] })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '14 days', label: 'AWAY' }, { value: '3 islands', label: 'TO EXPLORE' }, { value: '1', label: 'BIG SURPRISE' }], { label: 'Stats backdrop · island aerial' })

  // Half-time twist (bars 32–39)
  s = F.scene(4)
  b.marker(s.t, 'The twist', '#e0508a')
  shot(F, s.t, s.d, 'Slow-motion · sparklers on the beach', { kb: 'out' })
  caption(F, s.t + F.at(0.6), F.at(3), 'But that is not the real surprise.')
  s = F.scene(4)
  shot(F, s.t, s.d, 'Close-up · a hand holding two tickets', { kb: 'in' })
  caption(F, s.t + F.at(0.6), F.at(3), 'There is one more thing...')

  // Fake-out build (bars 40–46) and the second stop bar (47)
  s = F.scene(2); b.marker(s.t, 'Wait', purple); bigWord(F, s.t, s.d, 'WAIT', { bg: '#e0508a' })
  s = F.scene(2); bigWord(F, s.t, s.d, "THERE'S MORE", { bg: '#3a8df7' })
  s = F.scene(2); bigWord(F, s.t, s.d, "WHO'S COMING?", { bg: '#3ecfaf', color: '#0e1a2b' })
  s = F.scene(1); bigWord(F, s.t, s.d, '3 · 2 · 1', { bg: purple })
  s = F.scene(1); bigWord(F, s.t, s.d, '...', { bg: '#000000', color: acc })

  // Second chorus: the real reveal (bars 48–63, key up)
  s = F.scene(4)
  b.marker(s.t, 'Everyone', acc)
  bigWord(F, s.t, s.d, 'EVERYONE!', { sub: 'THE WHOLE FAMILY IS COMING TOO', bg: acc, color: '#150f28', subColor: '#150f28' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Mum and Dad', 'The cousins', 'Grandma'])
  beatCuts(F, 4, ['Airport hug', 'Cheering', 'Group selfie', 'Boarding'])
  s = F.scene(2)
  bigStatement(F, s.t, s.d, 'SEE YOU THERE', { sub: 'JUNE 12', label: 'Closing shot · beach at golden hour' })
  s = F.scene(2)
  endCard(F, s.t, s.d, { title: 'The trip of a lifetime', sub: 'Save the date', handle: '@yourhandle' })
  checkBars(F, REVEAL_BARS, 'tripReveal')

  b.audioTrack('Music · Plot Twist')
  b.music('music-plot-twist', { fromBar: REVEAL_FROM, fadeIn: 0.5, fadeOut: F.at(2) })
  return b.done()
}

const QUIZ_BARS = 32
const QUIZ_FROM = 8
function guessThePlace(): Project {
  const dur = barsDuration('music-plot-twist', QUIZ_BARS)
  const b = new TemplateBuilder('Guess the place · 1:04', '16:9', dur, '#150f28')
  const F = new Film(b, TWIST, 120)
  vignette(F, dur, 0.3)
  const purple = '#9a5bf5'

  let s = F.scene(4)
  b.marker(s.t, 'Title', purple)
  titleCard(F, s.t, s.d, { kicker: 'TRAVEL QUIZ', title: 'GUESS THE PLACE', subtitle: 'Three clues. One answer.', tr: null })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Mystery photo · blurred or cropped', { kb: 'in' })
  dayChip(F, s.t + 0.4, F.at(3), 'ROUND 1')
  caption(F, s.t + F.at(0.8), F.at(2.8), 'Can you name it before the beat drops?')

  b.marker(F.time, 'Clues', '#3ecfaf')
  s = F.scene(2); bigWord(F, s.t, s.d, 'CLUE 1', { sub: 'HOME TO 400 BRIDGES', bg: '#3ecfaf', color: '#0e1a2b', subColor: '#0e1a2b' })
  s = F.scene(2); bigWord(F, s.t, s.d, 'CLUE 2', { sub: 'BEST VISITED BY BOAT', bg: '#3a8df7' })
  s = F.scene(2); bigWord(F, s.t, s.d, 'CLUE 3', { sub: 'GELATO ON EVERY CORNER', bg: '#e0508a' })
  s = F.scene(1); bigWord(F, s.t, s.d, 'LOCK IT IN', { bg: purple })
  s = F.scene(1); bigWord(F, s.t, s.d, '?', { bg: '#000000', color: TWIST.accent })

  s = F.scene(2)
  b.marker(s.t, 'The answer', TWIST.accent)
  bigWord(F, s.t, s.d, 'VENICE', { sub: 'ITALY', bg: TWIST.accent, color: '#150f28', subColor: '#150f28' })
  beatCuts(F, 6, ['Grand Canal', 'Rialto bridge', 'Gondola ride'], { tag: ['VENICE', 'Italy'] })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '400+', label: 'BRIDGES' }, { value: '118', label: 'ISLANDS' }, { value: '0', label: 'CARS' }], { label: 'Stats backdrop · lagoon aerial' })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Play again?', sub: 'Comment your guess', handle: '@yourhandle' })
  checkBars(F, QUIZ_BARS, 'guessThePlace')

  b.audioTrack('Music · Plot Twist')
  b.music('music-plot-twist', { fromBar: QUIZ_FROM, fadeIn: 0.5, fadeOut: F.at(2) })
  return b.done()
}

// =============================================================================================
// ENJOY · Good Vibes (100 BPM, bar = 2.4 s)
// =============================================================================================
const TRIP_BARS = 60
const TRIP_FROM = 24
function friendsTrip(): Project {
  const dur = barsDuration('music-good-vibes', TRIP_BARS)
  const b = new TemplateBuilder('Friends trip recap · 2:24', '16:9', dur, '#102a43')
  const F = new Film(b, VIBES, 100)
  vignette(F, dur, 0.25)
  progress(F, dur)
  const acc = VIBES.accent

  let s = F.scene(4)
  b.marker(s.t, 'Title', acc)
  titleCard(F, s.t, s.d, { kicker: 'FRIENDS TRIP', title: 'GOOD TIMES', subtitle: 'Summer · 5 days · 6 people', tr: null })
  s = F.scene(4)
  shots(F, s.t, s.d, ['Packing the van', 'Snacks, obviously', 'Window seat', 'First stop'], { fast: true })
  dayChip(F, s.t + 0.4, F.at(3), 'DAY 01')
  s = F.scene(4)
  b.marker(s.t, 'Beach days', '#3a8df7')
  shots(F, s.t, s.d, ['Beach run', 'Lunch on the sand'])
  lowerThird(F, s.t + 0.8, s.d - 1.4, { title: 'Beach day', sub: 'Sunscreen optional, sunburn guaranteed', tag: 'DAY 02' })
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Cheers', 'Sunburn', 'Sunset'])

  s = F.scene(4)
  b.marker(s.t, 'Break', '#9aa5c4')
  polaroid(F, s.t, s.d, { label: 'Group photo', caption: 'us, mostly', date: 'DAY 03', side: 'left', rot: -3, paper: '#fff6e5', ink: '#2b2622' })
  s = F.scene(4)
  shot(F, s.t, s.d, 'Best seats in the house', { kb: 'out' })
  caption(F, s.t + F.at(0.5), F.at(3), 'Some trips are about the people you take.')

  s = F.scene(2)
  b.marker(s.t, 'Lake days', '#3ecfaf')
  bigWord(F, s.t, s.d, 'DAY 04', { sub: 'ROAD TO THE LAKE', bg: '#3ecfaf', color: '#102a43', subColor: '#102a43' })
  s = F.scene(2)
  shot(F, s.t, s.d, 'Lake at golden hour', { kb: 'in' })
  locationTag(F, s.t + 0.6, s.d - 1.2, 'CRYSTAL LAKE', 'Camp 2')
  s = F.scene(4)
  shots(F, s.t, s.d, ['Campfire stories', 'Karaoke in the van', 'Midnight swim'])
  lowerThird(F, s.t + 0.8, s.d - 1.4, { title: 'Campfire night', sub: 'Marshmallows and bad jokes', tag: 'DAY 04' })
  s = F.scene(4)
  quote(F, s.t, s.d, { text: 'Life is short. Take the trip.', author: '— THE GROUP CHAT', bg: VIBES.dark })

  b.marker(F.time, 'Build', acc)
  beatCuts(F, 4, ['Cannonball', 'Campfire', 'Karaoke', 'Late-night snacks'])
  beatCuts(F, 4, ['Sunrise swim', 'Hammock', 'Dance floor', 'Sparklers'])

  s = F.scene(4)
  b.marker(s.t, 'Finale', acc)
  bigStatement(F, s.t, s.d, 'BEST. TRIP. EVER.', { sub: 'SAME TIME NEXT YEAR?', label: 'Hero shot · the whole group' })
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '5 days', label: 'TOGETHER' }, { value: '6', label: 'FRIENDS' }, { value: '1,000', label: 'PHOTOS' }], { label: 'Stats backdrop · wide beach' })
  beatCuts(F, 4, ['Goodbye hug', 'Last sunset', 'Road home', 'Group selfie'])
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'Same time next year?', sub: 'Tag your crew', handle: '@yourhandle' })
  checkBars(F, TRIP_BARS, 'friendsTrip')

  b.audioTrack('Music · Good Vibes')
  b.music('music-good-vibes', { fromBar: TRIP_FROM, fadeIn: 0.4, fadeOut: F.at(3) })
  return b.done()
}

const FUN_BARS = 28
const FUN_FROM = 68
function summerFun(): Project {
  const dur = barsDuration('music-good-vibes', FUN_BARS)
  const b = new TemplateBuilder('Summer fun reel · 1:07', '16:9', dur, '#102a43')
  const F = new Film(b, VIBES, 100)
  vignette(F, dur, 0.25)
  const acc = VIBES.accent

  let s = F.scene(4)
  b.marker(s.t, 'Title', acc)
  titleCard(F, s.t, s.d, { kicker: 'FUN REEL', title: 'SUMMER', subtitle: 'The best bits', tr: null })
  beatCuts(F, 4, ['Splash', 'Ice cream', 'Skate park', 'Picnic'])
  s = F.scene(4)
  triptych(F, s.t, s.d, ['Sunglasses', 'Beach ball', 'Golden hour'])
  s = F.scene(4)
  stats(F, s.t, s.d, [{ value: '30°C', label: 'EVERY DAY' }, { value: '12', label: 'BEACHES' }, { value: '0', label: 'WORRIES' }], { label: 'Stats backdrop · sunny coast' })
  b.marker(F.time, 'Key lift', acc)
  s = F.scene(1); bigWord(F, s.t, s.d, "LET'S GO", { bg: acc, color: '#102a43' })
  s = F.scene(3); shots(F, s.t, s.d, ['Jump in', 'Slide', 'Road trip'], { fast: true })
  s = F.scene(4)
  polaroid(F, s.t, s.d, { label: 'Best friends', caption: 'the whole summer', date: 'JUL', side: 'right', rot: 3, paper: '#fff6e5', ink: '#2b2622' })
  s = F.scene(4)
  endCard(F, s.t, s.d, { title: 'See you next summer', sub: 'Keep the sun on', handle: '@yourhandle' })
  checkBars(F, FUN_BARS, 'summerFun')

  b.audioTrack('Music · Good Vibes')
  b.music('music-good-vibes', { fromBar: FUN_FROM, fadeIn: 0.4, fadeOut: F.at(3) })
  return b.done()
}

export const MOOD_TEMPLATES: TemplateDef[] = [
  { id: 'slow-travel-journal', name: 'Slow travel journal', description: `Chill, unhurried diary (${fmt(barsDuration('music-drift', JOURNAL_BARS))}): three parts, polaroids, quotes and soft captions, paced to Drift.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-drift', JOURNAL_BARS), previewTime: 6.5, music: 'Drift', build: slowJournal },
  { id: 'morning-retreat', name: 'Morning retreat', description: `Calm wellness reel (${fmt(barsDuration('music-drift', RETREAT_BARS))}): sunrise, yoga, tea ritual and a quote, with Drift.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-drift', RETREAT_BARS), previewTime: 6.5, music: 'Drift', build: morningRetreat },
  { id: 'night-shift-lookbook', name: 'Night shift lookbook', description: `City-at-night lookbook (${fmt(barsDuration('music-boom-bap', LOOKBOOK_BARS))}): beat-cut hooks, spots, murals and stats on a Boom Bap groove.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-boom-bap', LOOKBOOK_BARS), previewTime: 6, music: 'Boom Bap', build: urbanLookbook },
  { id: 'beat-lyric-video', name: 'Beat lyric video', description: `Lyric video (${fmt(barsDuration('music-boom-bap', LYRIC_BARS))}): big lines that rise on the beat over your footage, with a slow break and a chorus. Replace the words.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-boom-bap', LYRIC_BARS), previewTime: 9, music: 'Boom Bap', build: lyricVideo },
  { id: 'surprise-trip-reveal', name: 'Surprise trip reveal', description: `Announce a trip with clues, a silent "?" beat and a big reveal (${fmt(barsDuration('music-plot-twist', REVEAL_BARS))}), then a second twist. Cut to Plot Twist's stops and key change.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-plot-twist', REVEAL_BARS), previewTime: 38, music: 'Plot Twist', build: tripReveal },
  { id: 'guess-the-place', name: 'Guess the place', description: `Travel quiz (${fmt(barsDuration('music-plot-twist', QUIZ_BARS))}): three clues, a silent beat, then the answer drops with the chorus.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-plot-twist', QUIZ_BARS), previewTime: 6, music: 'Plot Twist', build: guessThePlace },
  { id: 'friends-trip-recap', name: 'Friends trip recap', description: `Feel-good group recap (${fmt(barsDuration('music-good-vibes', TRIP_BARS))}): day chips, beat cuts, polaroids, stats and a big finale on Good Vibes.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-good-vibes', TRIP_BARS), previewTime: 6, music: 'Good Vibes', build: friendsTrip },
  { id: 'summer-fun-reel', name: 'Summer fun reel', description: `One-minute summer highlights (${fmt(barsDuration('music-good-vibes', FUN_BARS))}) that lift with the key change at the end of Good Vibes.`, category: 'travel', aspect: '16:9', duration: barsDuration('music-good-vibes', FUN_BARS), previewTime: 6, music: 'Good Vibes', build: summerFun },
]
