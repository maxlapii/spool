import type { Asset } from './types'

export type MusicCategory = 'adventure' | 'chill' | 'hip' | 'surprise' | 'enjoy'

export const MUSIC_CATEGORIES: { id: MusicCategory; label: string }[] = [
  { id: 'adventure', label: 'Adventure' },
  { id: 'chill', label: 'Chill' },
  { id: 'hip', label: 'Hip' },
  { id: 'surprise', label: 'Surprise' },
  { id: 'enjoy', label: 'Enjoy' },
]

/** A bundled, royalty-free track (composed by scripts/make-sample-music.mjs). */
export interface SampleTrack {
  id: string
  name: string
  mood: string
  category: MusicCategory
  description: string
  bpm: number
  /** Length in seconds; every full-length track is a whole number of 4/4 bars (bars = BPM for 4:00). */
  duration: number
  size: number
  url: string
  /** Section starts in bars — handy for cutting video on a drop or chorus. */
  cues: { label: string; bar: number }[]
}

export const SAMPLE_TRACKS: SampleTrack[] = [
  {
    id: 'music-trailhead', category: 'adventure', name: 'Trailhead', mood: 'Bright · acoustic adventure', bpm: 112, duration: 240, size: 3841087, url: '/assets/music-trailhead.mp3',
    description: 'Plucked guitar, warm pads and a driving beat that builds to an anthemic chorus. Great for hiking, vlogs and recaps.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Verse', bar: 8 }, { label: 'Build', bar: 24 }, { label: 'Chorus', bar: 32 }, { label: 'Verse 2', bar: 48 }, { label: 'Bridge', bar: 64 }, { label: 'Build 2', bar: 80 }, { label: 'Final chorus', bar: 88 }, { label: 'Outro', bar: 104 }],
  },
  {
    id: 'music-open-road', category: 'adventure', name: 'Open Road', mood: 'Driving · road-trip energy', bpm: 124, duration: 240, size: 3841087, url: '/assets/music-open-road.mp3',
    description: 'Four-on-the-floor groove with sparkling arpeggios and a soaring lead. Road trips, city breaks, fast edits.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Build', bar: 8 }, { label: 'Drop', bar: 16 }, { label: 'Break', bar: 32 }, { label: 'Build 2', bar: 40 }, { label: 'Drop 2', bar: 48 }, { label: 'Verse', bar: 64 }, { label: 'Build 3', bar: 76 }, { label: 'Drop 3', bar: 84 }, { label: 'Finale', bar: 100 }, { label: 'Outro', bar: 116 }],
  },
  {
    id: 'music-summit', category: 'adventure', name: 'Summit', mood: 'Epic · cinematic expedition', bpm: 90, duration: 240, size: 3841087, url: '/assets/music-summit.mp3',
    description: 'Slow-burn strings and piano that swell into a huge finale with toms and a snare build. Mountains, expeditions, film trailers.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Theme A', bar: 8 }, { label: 'Theme B', bar: 20 }, { label: 'Build', bar: 32 }, { label: 'Climax', bar: 40 }, { label: 'Bridge', bar: 60 }, { label: 'Finale', bar: 70 }, { label: 'Outro', bar: 82 }],
  },
  {
    id: 'music-golden-hour', category: 'chill', name: 'Golden Hour', mood: 'Warm · lo-fi travel chill', bpm: 84, duration: 240, size: 3841087, url: '/assets/music-golden-hour.mp3',
    description: 'Dusty electric-piano chords, soft swung drums and a gentle guitar melody. Sunsets, beaches, travel diaries.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Groove', bar: 4 }, { label: 'Melody', bar: 20 }, { label: 'Groove 2', bar: 36 }, { label: 'Break', bar: 52 }, { label: 'Final', bar: 60 }, { label: 'Outro', bar: 76 }],
  },
  {
    id: 'music-drift', category: 'chill', name: 'Drift', mood: 'Chill · ambient float', bpm: 72, duration: 240, size: 3841087, url: '/assets/music-drift.mp3',
    description: 'Slow, airy pads, harp-like arpeggios and soft keys with a barely-there beat. Calm travel scenes, slow motion, sleep and focus.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Flow', bar: 8 }, { label: 'Melody', bar: 24 }, { label: 'Interlude', bar: 40 }, { label: 'Full', bar: 48 }, { label: 'Outro', bar: 64 }],
  },
  {
    id: 'music-boom-bap', category: 'hip', name: 'Boom Bap', mood: 'Hip · city hip-hop groove', bpm: 90, duration: 240, size: 3841087, url: '/assets/music-boom-bap.mp3',
    description: 'Swung drums, deep bass, jazzy electric-piano chords and horn stabs over vinyl crackle. Street scenes, city nights, cool edits.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Groove', bar: 4 }, { label: 'Melody', bar: 20 }, { label: 'Hook', bar: 36 }, { label: 'Break', bar: 44 }, { label: 'Groove 2', bar: 48 }, { label: 'Hook 2', bar: 64 }, { label: 'Outro', bar: 80 }],
  },
  {
    id: 'music-plot-twist', category: 'surprise', name: 'Plot Twist', mood: 'Surprise · playful twists', bpm: 120, duration: 240, size: 3841087, url: '/assets/music-plot-twist.mp3',
    description: 'Bouncy plucks that keep pulling tricks: sudden stops, a half-time twist and key changes. Reveals, unboxings, jokes and big surprises.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Verse', bar: 8 }, { label: 'Build (stop)', bar: 16 }, { label: 'Chorus', bar: 24 }, { label: 'Twist', bar: 40 }, { label: 'Fake-out (stop)', bar: 48 }, { label: 'Chorus, key up', bar: 56 }, { label: 'Music box', bar: 72 }, { label: 'Build (stop)', bar: 80 }, { label: 'Finale', bar: 88 }, { label: 'Outro', bar: 108 }],
  },
  {
    id: 'music-good-vibes', category: 'enjoy', name: 'Good Vibes', mood: 'Enjoy · sunny feel-good', bpm: 100, duration: 240, size: 3841087, url: '/assets/music-good-vibes.mp3',
    description: 'Funky bass, offbeat guitar chops, hand claps and a whistle-bright lead that lifts a tone for the last chorus. Fun, holidays, friends.',
    cues: [{ label: 'Intro', bar: 0 }, { label: 'Verse', bar: 4 }, { label: 'Pre-chorus', bar: 16 }, { label: 'Chorus', bar: 24 }, { label: 'Break', bar: 40 }, { label: 'Verse 2', bar: 48 }, { label: 'Pre-chorus 2', bar: 60 }, { label: 'Chorus 2', bar: 68 }, { label: 'Key lift', bar: 84 }, { label: 'Outro', bar: 96 }],
  },
  {
    id: 'sample-sunrise', category: 'enjoy', name: 'Sunrise (short loop)', mood: 'Uplifting · short loop', bpm: 100, duration: 32, size: 641088, url: '/assets/sample-sunrise.mp3',
    description: 'A 32-second uplifting loop for short clips.', cues: [{ label: 'Start', bar: 0 }],
  },
  {
    id: 'sample-lofi', category: 'chill', name: 'Lo-fi (short loop)', mood: 'Calm · short loop', bpm: 78, duration: 32, size: 641088, url: '/assets/sample-lofi.mp3',
    description: 'A 32-second calm lo-fi loop for short clips.', cues: [{ label: 'Start', bar: 0 }],
  },
]

export const SAMPLE_TRACK_IDS = SAMPLE_TRACKS.map((t) => t.id) as [string, ...string[]]

export const trackById = (id: string): SampleTrack | undefined => SAMPLE_TRACKS.find((t) => t.id === id)
export const barSeconds = (t: SampleTrack) => (60 / t.bpm) * 4

/** Project asset for a bundled track. */
export function sampleAsset(t: SampleTrack): Asset {
  return { id: t.id, name: `${t.name} · ${t.bpm} BPM`, type: 'audio', mime: 'audio/mpeg', size: t.size, url: t.url, duration: t.duration, createdAt: '2026-10-09T00:00:00.000Z' }
}
