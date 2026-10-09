# Spool setup and reference

Everything needed to run, configure and extend Spool. For the product overview see [README.md](README.md).

## Requirements

- Node.js 20 or newer (the dev scripts use `node --env-file-if-exists`)
- npm
- Optional: [Claude Code](https://claude.com/claude-code) signed in, for the Claude assistant

## Quick start

```bash
npm install          # also downloads a static FFmpeg binary for export
npm run dev          # web app on http://localhost:5173, API on http://localhost:4100
```

The Claude assistant uses your **Claude Code sign-in** (through the Claude Agent SDK) — no API key is needed.
Install Claude Code if you haven't (`npm i -g @anthropic-ai/claude-code`), run `claude` once to sign in, and the
panel reports "Claude Code · your@email". `npm run ai:check` verifies the connection from the terminal.

Open <http://localhost:5173>, pick a template (3 to 4 minute travel and adventure films, short social reels, or the brand demo) or create a blank project.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server + API server (with hot reload) |
| `npm run build` | Type-check and build the production client into `dist/` |
| `npm start` | Serve the built client and API from one process (`http://localhost:4100`) |
| `npm test` | Run the Vitest suite (timeline math, trimming/splitting, undo/redo, animation, persistence, tool validation) |
| `npm run typecheck` | Type-check client and server |
| `npm run ai:check` | Verify the Claude Code connection used by the assistant |

## Configuration

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `API_PORT` | API server port (default `4100`). The Vite dev server proxies `/api` and `/assets` to it. |
| `CLAUDE_MODEL` | Optional model override for the assistant (default: your Claude Code default model). |
| `ANTHROPIC_API_KEY` | Optional. If set, Claude Code bills this key instead of your subscription. Without any sign-in the editor stays fully usable and the Claude panel shows setup steps and an honest "Not signed in" state. |
| `FFMPEG_PATH` | Path to an FFmpeg binary. Defaults to the one bundled by `ffmpeg-static`. |
| `DATA_DIR` | Where projects, uploads and exports are stored (default `./data`). |

Claude usage counts against your Claude Code plan (or an API key if you set one); hosting and remote rendering are
likewise third-party costs outside the app's free-feature policy. Credentials never reach the browser.

## Project structure

```
src/components/{toolbar,sidebar,canvas,timeline,assistant,export,projects,ui}
src/store        editor + assistant state (Zustand)
src/engine       project model helpers, operations, animation, scene, render, snap, tool executor
src/services     API client, project/asset persistence, exporter
src/hooks        playback loop, autosave, shortcuts, routing
shared/          types and Claude tool schemas shared with the server
server/          Express API: projects, assets, Claude proxy, FFmpeg export
data/            local storage for projects, uploads, exports and a trash folder for deleted projects (git-ignored)
```

## Branding

The name lives in `shared/brand.ts` (product name, file-name slug and tagline), so it is easy to change. The logo is the name itself (`src/components/ui/Wordmark.tsx`): "spool" in bold geometric type where the two o's are eyes with brand-gradient rings. On load the letters rise in one by one and the eyes open as if waking up and glance left, then right. After that the pupils follow your pointer, the eyes blink at random (sometimes twice), glance around when idle or on touch screens, widen on hover and one winks on click. With reduced motion everything stays still. The browser tab icon is animated too: it draws the same eyes on a canvas and swaps them in as the page icon whenever they move, so the tab wakes up, follows your pointer, blinks and glances around exactly like the header (`src/utils/eyes.ts` holds the shared behaviour, `src/utils/faviconEyes.ts` draws the icon). When nothing moves it stops redrawing, and `public/favicon.svg` is the still icon for browsers that ignore icon changes. Letter spacing is set per letter so the gaps between s, p, the two eyes and l are all equal. Projects, theme and layout saved in your browser under the earlier name are carried over automatically.

## Workspace reference

The workspace follows mtioon.com: a warm background with floating white cards.

- **Top bar** — "‹ Projects", panel toggle, editable title, save status, aspect-ratio chip, Export.
- **Left panel** — segmented tabs Style / Motion / Project / Claude (collapsible from the top bar).
  - *Style* is contextual: with nothing selected it offers "Add to canvas", background and a layer list; with a layer selected it shows a name header, alignment/order, layout, typography or shape/media options; with an audio clip it shows volume and fades.
  - *Motion* shows clip timing, entrance/exit presets, the transition from the previous clip, and a keyframe editor.
  - *Project* holds composition settings, the **Media** library (drag-and-drop uploads, thumbnails, metadata, search, rename, delete, drag onto the canvas or timeline), section markers and the shortcut list.
  - *Claude* is the assistant panel (see below).
- **Canvas card** — hugs the selected aspect ratio (wide for 16:9, a narrow centred column for 9:16) with the composition fitted inside; select, move (with centre/edge snapping), resize, rotate, double-click text to edit inline. The footer bar holds zoom and Fit, the composition size, "Ask Claude" (`/`) and "Play with sound"; ⌘/Ctrl + scroll zooms.
- **Timeline card** — split/delete/marker/snap tools, big play button with timecodes, undo/redo and zoom; ruler, pastel section chips, playhead, tracks with type badges and lock/hide/mute/reorder, colour-coded clips with grip handles, drag to move (including across compatible tracks), trim, split at playhead, snapping and horizontal scroll. Clips on one track never overlap; new elements land on the first track with room.

## Themes

Light and dark themes share one token set (`src/index.css`); switch with the sun / moon control in the header or the
editor toolbar. Light is the default and the choice is remembered per browser.

## Templates and music

The Projects page shows 28 bundled templates in a full-width strip that glides on its own (hover to pause) and can be browsed by hand, with live previews rendered by the same canvas renderer the exporter uses
(`src/engine/templates/`). Every template is an ordinary project: placeholders are coloured, gently moving frames you replace by
dragging your own clips from Project → Media onto them. Every template already carries a full-length music track, and storyboards are cut in whole bars so scene changes land on the beat.

**Long travel and adventure films** (3 to 4 minutes, chaptered with section markers, letterbox, progress bar, chapter cards, lower thirds, location tags, quotes, stats, polaroid and triptych layouts, credits):

| Template | Format | Music |
| --- | --- | --- |
| Epic adventure film | 16:9 · 4:00 | Summit (90 BPM, cinematic build) |
| Island hopping journal | 16:9 · 4:00 | Golden Hour (84 BPM, warm and chilled) |
| Road trip diary | 16:9 · 2:58 | Open Road (124 BPM, driving) |
| Wild trails & camping | 16:9 · 3:43 | Trailhead (112 BPM, acoustic) |
| Around the world · year recap | 16:9 · 4:00 | Trailhead |
| Backpacker vlog | 9:16 · 3:09 | Trailhead |
| City break weekend | 9:16 · 2:00 | Open Road |
| Beach sunset escape | 9:16 · 2:17 | Golden Hour |

**Mood templates (16:9 only)**, two per new music track, cut in whole bars so scene changes land on the beat:

| Template | Length | Music | Idea |
| --- | --- | --- | --- |
| Slow travel journal | 4:00 | Drift | Three unhurried parts, polaroids, quotes, soft captions |
| Morning retreat | 1:20 | Drift | Calm wellness reel with a quote and sign-off |
| Night shift lookbook | 3:33 | Boom Bap | City at night: beat-cut hooks, spots, murals, stats |
| Beat lyric video | 1:25 | Boom Bap | Big lyric lines rising on the beat; replace the words |
| Surprise trip reveal | 2:08 | Plot Twist | Clues, a silent "?" beat, the reveal, then a second twist |
| Guess the place | 1:04 | Plot Twist | Travel quiz: three clues, a silent beat, the answer drops |
| Friends trip recap | 2:24 | Good Vibes | Day chips, beat cuts, polaroids, stats and a big finale |
| Summer fun reel | 1:07 | Good Vibes | One-minute highlights that lift with the key change |

The two Plot Twist templates place their black "?" frames on the track's silent stop bars. Templates live in `src/engine/templates/moods.ts`.

**Multi-music templates (16:9)**: each section is cut to its own song at that song's tempo, and the songs crossfade on two overlapping audio tracks (Music A and Music B):

| Template | Length | Songs |
| --- | --- | --- |
| Journey in four moods | 3:14 | Drift, Trailhead, Boom Bap, Good Vibes |
| Travel mixtape | 3:06 | Drift, Trailhead, Open Road, Boom Bap, Plot Twist, Good Vibes, each introduced by a "now playing" card |
| Mood switch | 0:59 | Drift, Plot Twist (with its silent stop bar), Good Vibes |

**Group trip story (16:9, 4:39)**: a friends' bus trip in six sections, each with its own music, crossfaded between sections:

| Section | Music | What happens |
| --- | --- | --- |
| 1 Intro | Drift (slow, lazy) | Title card and two slow dissolves |
| 2 The route | Trailhead (chill verse, build, chorus drop) | A map where the route draws itself, a bus drives it, thumbnails pop at each stop, and the arrival lands on the chorus |
| 3 Activities | Golden Hour (smooth, romantic) | Warm shots with lower-thirds, a polaroid and a triptych |
| 4 Group fun | Boom Bap then Good Vibes (hip, then enjoy) | Fast group clips, photos, blooper reel and stats |
| 5 Members | Drift, kept at half volume | Six cards, each with a talking-video frame, a name, a role and a wish for the next trip |
| 6 Close | Golden Hour outro (slowing down) | Six thumbnails, the group photo and a thank-you |

The map is built from editable shapes (water, roads, parks), so it needs no map service. To use your own map, take a Google Maps screenshot or screen recording (keep its attribution visible and follow Google's terms), drop it over the stylised map, then move the pins, route segments and bus keyframes to match. Source: `src/engine/templates/grouptrip.ts`.

**Short social templates:** Music montage (9:16, 34 s), Season recap (9:16, 27 s), Life in 2026 (16:9, 27 s), Destination highlights (9:16, 20 s),
Top 5 places (9:16, 25 s), Travel diary (16:9, 24 s), Wanderlust quote (1:1, 12 s) and the Brand launch promo (16:9, 15 s).

Add a template by writing a builder function in `src/engine/templates/` (`adventure.ts` for long films, `travel.ts` for short ones) and registering it;
`helpers.ts` provides the builder (tracks, lanes, shots with Ken Burns moves, text, rectangles with gradients, music placement) and `scenes.ts`
a library of film scenes (title and chapter cards, lower thirds, captions, quotes, stats, credits).

### Browsing templates

Drag the strip with a mouse, swipe on touch, scroll sideways with a trackpad or Shift + wheel, press the left and right arrow keys, or use the arrow buttons. Vertical scrolling still moves the page.
Search matches names, descriptions, song names and formats (every word must match). The category chips are All, Adventure, Chill, Hip, Surprise, Enjoy, Multi-music and Brand, each with a count; a template belongs to the mood of every song it plays.
The filter logic lives in `src/engine/templates/filters.ts` and the multi-song templates in `src/engine/templates/mixes.ts`.

### Music

Eight royalty-free, full-length (4:00) instrumentals and two short loops are synthesised by `node scripts/make-sample-music.mjs [name]`
(the loops by `scripts/make-sample-loops.mjs`), shipped in `server/samples/` and copied into `data/assets/` on start.

| Mood | Track | BPM | Feel |
| --- | --- | --- | --- |
| Adventure | Trailhead | 112 | Bright acoustic guitar that builds to an anthemic chorus |
| Adventure | Open Road | 124 | Driving four-on-the-floor road-trip energy |
| Adventure | Summit | 90 | Slow-burn, cinematic strings and piano |
| Chill | Golden Hour | 84 | Warm lo-fi electric piano, sunsets and beaches |
| Chill | Drift | 72 | Ambient pads and harp-like arpeggios, barely-there beat |
| Hip | Boom Bap | 90 | Swung drums, deep bass, jazzy keys and horn stabs on vinyl crackle |
| Surprise | Plot Twist | 120 | Playful plucks with sudden stops, a half-time twist and key changes |
| Enjoy | Good Vibes | 100 | Funky bass, offbeat guitar, hand claps and a final key lift |

Open **Project → Music library**, filter by mood, preview a track from any section (intro, build, drop, chorus, outro) and add it to the timeline.
Claude can do the same with the `add_sample_music` tool, whose description is generated from the same catalogue (`shared/music.ts`).
The reference reels' own songs are not bundled. Replace the music with your own from Project → Media.

### Motion and typography

Entrance and exit presets (fade, rise, slide, drift, scale, zoom-out, blur-in, wipe, pop, rotate), transitions (crossfade, blur dissolve, wipe, slide, zoom, fade through black) and easings (including exponential, quartic and smootherstep) are tuned for small, natural movements.
Crossfades keep the outgoing shot opaque so the picture never dips to the background. Text supports a soft shadow and rectangles support linear or radial gradients, used for scrims and vignettes.
Blur, wipes, gradients and shadows render identically in the preview and the exported video.

## Speed and editing model

Open **Project → Speed**. Pick a speed for the **whole video**, or for any **section**. A section runs from its marker (the bookmark button on the timeline) to the next marker, and the part before the first marker only follows the whole-video speed. Each control has quick values (x0.5, x1, x1.5, x2, x4) and a free number from x0.25 to x4. The whole-video speed and a section's speed multiply (an x2 section in an x2 video plays at x4).

- **Preview:** playback runs at the section's speed, including its audio (pitch is kept) and video clips. A badge next to the timecode shows the current speed and the exported length, and section chips on the timeline show their speed.
- **Export:** the exported video really is faster or slower. Frames are rendered at the right moments of the timeline, so animations speed up or slow down with the footage, and the music and clip audio are retimed per section with FFmpeg's `atempo` (no pitch change). The export dialog shows the new length, for example a 4:39 timeline exported as 3:10.
- **Limits:** the timeline is still up to 5 minutes; with slow motion the exported video can be up to 20 minutes. Speeds that would exceed that are refused with a clear message.
- **Claude:** ask "speed up the intro to 2x" or "slow down the ending". The `set_speed` tool changes the whole video or a section, and Claude adds markers first when a part has none.
- **Undo:** speed changes are normal edits, so undo and redo work. A new marker inside a sped-up section inherits that section's speed.

Code: `src/engine/speed.ts` (time mapping), `src/components/sidebar/SpeedPanel.tsx`, `server/audioSpeed.ts` (audio filters).

A project (`shared/types.ts`) contains composition settings, assets, tracks, clips, layers, markers and export settings.
Visual clips point at exactly one layer (text, shape, image, video); audio clips carry their own audio settings.
Track order is z-order. All times are seconds; `src/utils/time.ts` is the only place timeline time is converted to pixels.

Every edit — from the canvas, the timeline, the inspector, keyboard shortcuts or Claude — goes through the pure
operations in `src/engine/operations.ts`, which validate input and return a new project. The Zustand store
(`src/store/editorStore.ts`) owns the single project state plus undo/redo history; drags use a snapshot + transient
patches so one gesture is one undo step. Animation state is evaluated by `src/engine/animation.ts` at the playhead
time, so previews follow the timeline exactly, and `src/engine/scene.ts` is shared between the live preview and the
export renderer.

### Keyboard shortcuts

Space play/pause · ⌫ delete · ⌘Z / ⇧⌘Z undo/redo · ⌘S save · ⌘D duplicate · ⌘A select all · S split at playhead ·
← → step a frame (or nudge the selection; ⇧ for 10px) · Home/End · Esc deselect · ⇧-drag constrain or multi-select ·
⌥-drag disables snapping · ⌘/Ctrl + scroll zooms the canvas. Shortcuts are ignored while typing in a field.

## Claude tool system

The assistant edits the project through a typed tool system (`shared/ai/tools.ts`, 25 tools: read project summary,
selected layer, list clips, create text/shape layers, add media, update layers, move/trim/split/delete clips,
animations, keyframes, transitions, composition settings, audio, bundled music, markers, speed, alignment, layer order, preview).

Flow: the client posts the prompt plus a compact project snapshot to `POST /api/ai/chat`; the server runs the Claude
Agent SDK (`server/ai.ts`), which talks to Claude through your Claude Code sign-in and exposes the editor tools as an
in-process MCP server. Each tool call is streamed to the browser as a `tool_request`, validated with Zod, executed
through the same operations the UI uses, and answered via `POST /api/ai/tool-result`; text, status (retries, usage
limits) and completion stream back as newline-delimited JSON. Follow-up prompts resume the same Claude session.
Mutating tools are grouped into **one undo step** per request, and each assistant message lists the applied edits with
an **Undo changes** action. Invalid ids, negative durations, unsupported properties or out-of-range values are rejected
and reported back to Claude so it can correct itself. Nothing is faked: without a sign-in the panel is disconnected.

## Export pipeline

The Export dialog offers aspect ratio, resolution presets (1920×1080, 1080×1920, 1080×1080, …), frame rate,
MP4 (H.264) or WebM (VP9), quality, progress and cancel. Frames are rendered in the browser with the Canvas 2D renderer
(`src/engine/render.ts`, same scene graph as the preview: text, shapes, images, video frames, animations, transitions)
and streamed to the API server, which mixes audio clips (volume, fades, placement) and encodes the file with FFmpeg
(`server/export.ts`). The result is downloaded from the dialog. If FFmpeg is missing the dialog says so and explains
how to configure it.

## Limitations

- Compositions and exports are capped at 5 minutes (300 s). Export renders in the browser, so a 5-minute 1080p video takes several minutes; keep the tab open.
- Fonts are limited to the bundled Google Fonts list (Plus Jakarta Sans, Inter, Poppins, Space Grotesk, Playfair Display, DM Serif Display, JetBrains Mono) plus Georgia/Arial.
- The assistant needs a Claude Code sign-in on the machine running the API server; usage counts against that plan's limits.
- Video layers in the preview are seeked by the browser; frame-accurate scrubbing depends on the codec.
- There is no multi-user collaboration or cloud storage; projects and media live in `data/` (an object-storage adapter would go in `server/assets.ts`).
