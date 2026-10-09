# Build a Lightweight, Professional AI Video Editor Inspired by Mtioon

Act as a senior frontend engineer, product designer, and AI application architect.

Build a clean, professional, browser-based video editor inspired by the layout, workflow, and visual design of **mtioon.com**, using the provided screenshot as the primary visual reference.

The application should feel lightweight, intuitive, polished, and easy to use. It should combine a visual composition editor, a multitrack timeline, simple animation tools, media management, and Claude AI-assisted editing in one workspace.

The goal is to reproduce the core editing experience and useful advanced functionality of a modern AI-powered video editor, while keeping the codebase and user experience as simple as possible.

**Product principle: Professional capabilities, simple interface, free to use.**

Do not build an unnecessarily complicated video production suite. Focus on a small set of well-integrated features that work reliably.

---

## 1. Product Goals

Build a working video editor with these priorities:

1. Clean, professional UI inspired by the provided Mtioon screenshot.
2. Lightweight, maintainable technology.
3. Easy-to-understand editing workflow.
4. Functional canvas and timeline.
5. Claude AI integration for natural-language editing.
6. Professional typography, animations, transitions, and export.
7. Free access to all implemented core and advanced features.
8. No subscriptions, paywalls, artificial feature restrictions, or premium-only controls in the application we build.
9. A working application rather than a static mockup.

Use original branding and assets. Reproduce the useful design patterns and editing concepts without copying proprietary source code or assets.

Working product name: **Spool** (set in `shared/brand.ts`). Keep the name easy to change.

## 2. Lightweight Tech Stack

Choose the smallest practical stack that can support a real editing experience.

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Lucide icons
* Zustand for shared editor state, if needed

Use native CSS for layouts, transitions, and visual styling. Prefer reusable components and simple hooks over excessive abstractions.

### Canvas and animation

* HTML Canvas or SVG for lightweight interactive composition.
* CSS transforms and Web Animations API for suitable preview animations.
* A unified timeline-based animation model so preview animations follow the playhead.

Choose one primary rendering approach and avoid introducing multiple overlapping canvas frameworks unless the project genuinely requires them.

### Video and audio

* HTML video and audio elements for playback and preview.
* FFmpeg or FFmpeg.wasm for media operations where practical.
* A lightweight server-side FFmpeg rendering endpoint or worker for reliable final exports when necessary.

Do not assume browser playback APIs can export a complete multitrack composition automatically. Build the actual export pipeline required by the supported editing features.

### Backend

Start with the simplest backend that supports the required functionality.

Prefer:

* Node.js.
* TypeScript.
* A small API using the existing server framework, or Express if starting from scratch.
* Local development storage for project metadata where appropriate.
* File-system storage for local development assets.
* An optional object-storage adapter for production deployment.

Do not introduce PostgreSQL, Redis, queues, microservices, Docker, or complex cloud infrastructure unless a concrete requirement justifies them.

Use SQLite if a persistent database is necessary for the initial version.

### AI integration

* Official Anthropic TypeScript SDK.
* A small server-side API endpoint.
* Validated structured tool calls for editor operations.

Keep the architecture modular so infrastructure can be upgraded later without rewriting the editor.

**Important:** Start with the existing repository's stack when it already works. Do not replace working infrastructure just to match this recommendation.

## 3. Visual Design — Follow the Provided Reference

The provided screenshot defines the intended overall workspace.

Reproduce its visual hierarchy and layout closely, while creating original implementation details.

### Overall workspace

Use a desktop-first editor with four main regions:

1. Compact top toolbar.
2. Narrow left sidebar.
3. Large central preview canvas.
4. Full-width timeline along the bottom.

The canvas should receive the majority of the screen space. The timeline should be visible without requiring navigation to another page.

Use a subtle light-gray application background, white panels, thin borders, restrained shadows, rounded corners, and carefully spaced controls.

Avoid excessive gradients, oversized cards, decorative marketing elements, and unnecessary visual clutter.

### Top toolbar

Include:

* Back to projects.
* Editable project title.
* Style or design settings.
* Motion or animation settings.
* Project settings.
* Claude AI entry point.
* Aspect-ratio selector.
* Export button.

Keep the toolbar compact and visually quiet.

### Left sidebar

Use a narrow, collapsible panel with simple tabs for:

* Style
* Motion
* Project
* Claude AI

Provide contextual controls within each tab instead of creating dozens of separate navigation sections.

The Claude tab should resemble a clean, compact AI assistant panel with a conversation history, prompt input, suggested actions, and clear connection status.

### Central canvas

Create a large preview stage with a subtle dotted grid around the composition.

The composition itself should:

* Maintain its selected aspect ratio.
* Be centered in the available workspace.
* Display real editable content.
* Support text, shapes, images, and supported video elements.
* Allow selection and direct manipulation.
* Display resize handles and selection outlines.
* Support zoom and fit-to-view.

Create an attractive default example composition using original sample assets. It can include a folder-like graphic, floating labels, text, color swatches, and animated elements inspired by the screenshot.

Do not use a flattened screenshot as the editable composition.

Every sample element must be an actual editable object in the project model.

### Bottom timeline

Make the timeline a major, always-accessible part of the editor.

Include:

* Playback controls.
* Current time and total duration.
* Playhead.
* Time ruler.
* Section markers.
* Multiple tracks.
* Clip blocks with clear labels.
* Horizontal scrolling.
* Timeline zoom.
* Track controls.
* Selection states.
* Drag handles for trimming.

Use visually distinct but coordinated colors for different track types.

Make the timeline dense enough to feel like a professional editor without becoming difficult to understand.

### Responsive layout

Prioritize desktop screens, especially 1280px and wider.

On smaller screens:

* Allow sidebars to collapse.
* Allow the inspector to open as a drawer.
* Preserve access to the canvas and timeline.
* Avoid broken or overflowing controls.

Do not attempt to reproduce the entire desktop editing workflow on a phone at the expense of usability.

## 4. Core Editing Model

Create a simple, consistent project data model.

A project contains:

* Project settings.
* Composition dimensions.
* Media assets.
* Tracks.
* Clips.
* Editable layers.
* Animations and keyframes.
* Section markers.
* Export settings.

Each clip should have a unique ID, track ID, start time, duration, source in-point and out-point where relevant, and a reference to its associated asset or layer.

Use seconds or another consistent time unit internally. Convert timeline time to screen coordinates through a single shared utility.

All editing surfaces must use the same project state.

The canvas, timeline, properties panel, playback controls, and Claude AI tools must remain synchronized.

Avoid duplicating editor state across separate components.

## 5. Essential Editing Features

Implement these features first:

### Project management

* Create a project.
* Rename a project.
* Save and reopen projects.
* Duplicate a project.
* Choose aspect ratio.
* Autosave with visible status.

### Canvas editing

* Add text.
* Edit text.
* Change font, size, color, alignment, and weight.
* Add shapes.
* Change fills, strokes, and opacity.
* Add images.
* Move, resize, and rotate objects.
* Control layer order.
* Lock and hide layers.
* Delete selected objects.

### Timeline editing

* Add clips.
* Select clips.
* Move clips.
* Trim clip edges.
* Split clips at the playhead.
* Change clip duration.
* Move clips between compatible tracks.
* Delete clips.
* Add and edit section markers.
* Zoom and scroll.
* Snap clips to useful boundaries.

### Playback

* Play and pause.
* Seek by clicking the timeline.
* Scrub the playhead.
* Display the current timecode.
* Synchronize the preview with the playhead.
* Render supported animations at the correct timeline time.

### History

* Undo.
* Redo.
* Use a consistent operation history for both manual edits and AI edits.

Keyboard shortcuts should include Space for playback, Delete for selected items, Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo, and Ctrl/Cmd+S for save.

Do not intercept typing shortcuts when the user is editing text fields.

## 6. Motion and Professional Features

Provide advanced creative capabilities without making the UI complicated.

Implement:

* Fade in and fade out.
* Slide animations.
* Scale animations.
* Rotation.
* Position and opacity keyframes.
* Easing presets.
* Basic transitions.
* Clip duration controls.
* Text entrance animations.
* Background colors and images.
* Multiple visual layers.
* Common aspect-ratio presets.
* Audio volume controls.
* Basic audio fades.
* Simple scene and section organization.

Use contextual controls and sensible defaults.

For example, selecting a text layer should reveal its typography and animation controls. Selecting an audio clip should reveal volume, timing, and fade controls.

Avoid exposing every advanced parameter simultaneously.

All implemented features must be available without artificial premium restrictions.

## 7. Claude AI — Natural-Language Editing

Claude is an integral part of the application.

Users should be able to describe the result they want instead of manually configuring every property.

Example prompts:

* "Create a professional 15-second product promo."
* "Make the opening more dynamic."
* "Add an animated title at the beginning."
* "Use a modern sans-serif font throughout."
* "Make this composition vertical for Reels."
* "Add a smooth fade between these scenes."
* "Make the text animation slower."
* "Add a logo reveal at the end."
* "Create a clean end card with our brand colors."
* "Move the CTA to the last three seconds."
* "Make all elements align neatly."
* "Suggest improvements to this video."

### Claude panel UX

Keep the interface compact and consistent with the screenshot.

Include:

* Conversation history.
* Prompt input.
* Send action.
* Suggested prompts.
* Loading indicators.
* Connection status.
* Clear execution feedback.
* A concise list of proposed or completed edits.
* Apply and Cancel controls for proposed multi-step changes where appropriate.

### Claude tool architecture

Claude must use validated editor operations instead of writing arbitrary application code.

Implement a small, typed tool system with operations such as:

* Get project summary.
* Get selected layer.
* List timeline clips.
* Create text layer.
* Create shape layer.
* Add media clip.
* Update layer properties.
* Move clip.
* Trim clip.
* Split clip.
* Create animation.
* Add keyframe.
* Apply transition.
* Change composition settings.
* Update audio settings.
* Request preview update.

Validate inputs before applying operations.

Reject invalid IDs, negative durations, unsupported properties, invalid keyframes, and out-of-range values.

Manual edits and Claude edits must call the same underlying editor functions.

Group related AI changes into a single undoable operation where possible.

### Expected AI workflow

When a user asks Claude to create a video:

1. Read the current project state.
2. Understand the requested outcome.
3. Generate a valid edit plan.
4. Apply supported operations.
5. Update the actual timeline and canvas.
6. Allow the user to review and refine the result.
7. Explain any unsupported operations honestly.

Do not fake AI functionality with hardcoded responses.

### API security

Use the official Anthropic SDK on the server.

Store credentials in environment variables. Never expose API keys in browser code or commit them to the repository.

If no API key is configured:

* Keep the editor fully usable.
* Show clear setup instructions.
* Display an honest disconnected state.
* Optionally provide a local demo mode using deterministic sample actions.

Do not pretend the application is connected to Claude when it is not.

## 8. Media Library

Keep media management simple.

Support:

* Drag-and-drop uploads.
* Images.
* Video files.
* Audio files.
* Asset thumbnails.
* Asset names.
* Basic file metadata.
* Search.
* Rename and delete.
* Dragging assets into the canvas or timeline.

Validate uploads and handle unsupported formats gracefully.

Use temporary browser object URLs only for previews, and clean them up when no longer needed.

Persist asset references in a form that remains valid after reopening a project.

## 9. Real Export Functionality

Provide a simple Export dialog.

Include:

* Aspect ratio.
* Resolution.
* Frame rate.
* Supported output format.
* Render progress.
* Cancel action where supported.
* Download of the completed file.
* Clear error reporting.

Support common output dimensions such as:

* 1920 × 1080.
* 1080 × 1920.
* 1080 × 1080.

Use a suitable rendering pipeline, such as FFmpeg with a composition renderer, for the actual output.

The exported video must reflect the supported timeline clips, text, layers, animation, and audio.

Do not export a screenshot or rename an image to an MP4 file.

If full rendering requires server-side infrastructure, implement the export interface and a clearly documented backend integration rather than claiming that rendering works when it does not.

## 10. Free-by-Default Product Policy

The application we build should make all implemented editing capabilities freely available to its users.

Do not implement:

* Subscription plans.
* Premium feature gates.
* Paywalled animation controls.
* Artificial export limits.
* Watermarks added to restrict free exports.
* Locked AI editing tools.
* Upgrade banners.
* Credit systems for features that are implemented locally.

Allow users to use all implemented core and advanced editing features without paying the application.

However, clearly distinguish between the application's own free feature policy and external infrastructure costs.

Claude API usage, hosting, and remote rendering may incur third-party costs depending on deployment. Do not claim these external services are inherently free. Make the AI connection configurable and keep local editing usable without external API access.

Do not bypass authentication, usage restrictions, or access controls imposed by third-party services.

## 11. Code Quality and Project Structure

Keep the codebase small and understandable.

Suggested structure:

* `src/components/toolbar`
* `src/components/sidebar`
* `src/components/canvas`
* `src/components/timeline`
* `src/components/inspector`
* `src/components/assistant`
* `src/components/export`
* `src/store`
* `src/types`
* `src/engine`
* `src/services`
* `src/utils`
* `server`

Use reusable components, strict TypeScript types, and a clear separation between UI and editor logic.

Avoid:

* Overengineering.
* Unnecessary dependencies.
* Massive components.
* Duplicate state.
* Hardcoded timeline coordinates.
* Fake buttons.
* Unimplemented controls presented as functional.
* Arbitrary generated code execution.
* Excessive configuration files.

Write tests for timeline calculations, clip trimming, splitting, undo/redo, animation interpolation, project persistence, and Claude tool validation.

## 12. Implementation Order

Build the product incrementally.

**Phase 1: Match the reference layout**

* Top toolbar.
* Left sidebar.
* Central preview.
* Bottom timeline.
* Professional spacing, typography, and colors.
* Original demo composition.

**Phase 2: Make the editor real**

* Shared project state.
* Editable canvas objects.
* Timeline clips.
* Playhead.
* Playback.
* Move, trim, and split operations.
* Undo and redo.

**Phase 3: Persistence and media**

* Asset uploads.
* Project saving.
* Autosave.
* Reopening projects.
* Drag-and-drop asset placement.

**Phase 4: Claude AI**

* Secure server integration.
* AI assistant panel.
* Structured tool calls.
* Validated editing operations.
* Review and undo workflows.

**Phase 5: Animation and export**

* Keyframes.
* Easing.
* Transitions.
* Audio controls.
* Rendering pipeline.
* Downloadable exports.

**Phase 6: Polish**

* Keyboard shortcuts.
* Responsive resizing.
* Error handling.
* Accessibility.
* Testing.
* Performance.
* Documentation.

Prioritize a working end-to-end editing experience over a large number of incomplete features.

## 13. Definition of Done

The application is complete when:

* It runs locally with documented commands.
* The workspace resembles the supplied reference in layout and visual hierarchy.
* The interface is clean, consistent, and easy to understand.
* Canvas objects are genuinely editable.
* Timeline clips have functional timing.
* Scrubbing updates the preview.
* Core clip editing operations work.
* Undo and redo work.
* Projects can be saved and reopened.
* Media can be uploaded and placed.
* Claude can modify the project when properly configured.
* AI edits use the same editor state and operation history.
* Supported animations follow the timeline.
* Export produces valid video output when the required rendering dependencies are configured.
* All implemented editing features are available without application-imposed premium restrictions.
* The application passes the available type checks, tests, and production build.

## Final instruction

Start by inspecting the existing repository and the provided reference screenshot.

Then build the application directly in the codebase.

Do not stop at a plan, wireframe, static screenshot, or frontend mockup.

Make sensible technical decisions without asking for confirmation for routine implementation details.

Prioritize these outcomes in order:

1. Match the reference layout.
2. Keep the UI clean and professional.
3. Make the canvas and timeline genuinely functional.
4. Connect Claude to real editing operations.
5. Implement reliable animation and export.
6. Keep the stack lightweight and all implemented features free to use.

At completion, provide the startup commands, configuration instructions, implemented feature summary, test results, and any remaining limitations.

**Begin implementation now.**
