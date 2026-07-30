---
name: talking-head-social-overlays
description: Package an existing MP4 talking-head video into a polished 9:16 social video with Be Vietnam Pro typography, top-down sequential key text, timed SVG diagrams, visual templates, GSAP keyframes, social-platform safe zones, HyperFrames preview approval, and GPU/NVENC rendering. Use for Vietnamese talking-head, interview, expert, educational, or sales videos when the user asks to add key text, motion graphics, diagrams, effects, or reuse the approved "5 yếu tố" editing style while preserving the original footage and audio.
---

# Talking Head Social Overlays

Create a repeatable HyperFrames project around an existing video. Keep the source program untouched. Build designed overlays rather than verbatim subtitles.

## Required companion skills

Read and follow:

- `talking-head-recut` for transcript-driven editorial packaging.
- `hyperframes-core`, `hyperframes-animation`, and `hyperframes-keyframes` while authoring motion.
- `hyperframes-cli` before `check`, `snapshot`, `preview`, or `render`.

Run `npx hyperframes skills update talking-head-recut` before starting a new production.

## Workflow

### 1. Preflight the source

1. Resolve the exact MP4 path.
2. Record SHA-256, duration, dimensions, frame rate, and audio streams.
3. Never overwrite, transcode, trim, or move the original.
4. If a reference video is provided, inspect a contact sheet before designing.

### 2. Scaffold the project

Cross-platform command (recommended):

```bash
node "<SKILL_DIR>/scripts/scaffold.mjs" \
  --video "<absolute-input.mp4>" \
  --project "<absolute-new-project-dir>" \
  --title "<reader-facing-title>" \
  --id "<lowercase-id>"
```

PowerShell wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File "<SKILL_DIR>\scripts\scaffold.ps1" `
  -VideoPath "<absolute-input.mp4>" `
  -ProjectDir "<absolute-new-project-dir>" `
  -Title "<reader-facing-title>" `
  -CompositionId "<lowercase-id>"
```

The target must be new or empty. The script stages the video as a hard link when possible, copies Be Vietnam Pro, GSAP, the visual engine, and creates `data/storyboard.json`. It records the source filename and SHA-256 but never the source's absolute path.

### 3. Transcribe and map word timing

Produce word-level timestamps with local Whisper or reuse a trustworthy timestamped transcript.

- Correct Vietnamese names and technical terms without changing timestamps.
- Anchor every `item.at` to the first spoken word that introduces that exact concept.
- Allow a title to lead the spoken phrase by at most 0.10–0.25 seconds.
- Reveal list items one at a time. Never make every item visible at scene start.

### 4. Author the storyboard

Replace the scaffold placeholder completely. Set `status` to `ready`.

Read [storyboard-and-templates.md](references/storyboard-and-templates.md) before choosing templates or effects.

Use these non-negotiable portrait safe zones:

- Content starts at `y=140`.
- Primary overlay content ends by `y=900`.
- Keep the bottom `420px` empty for captions and social-platform UI.
- Prefer a top-to-bottom reading order.
- Preserve the speaker's eyes and mouth whenever possible.

Target roughly one designed scene per distinct claim, not one scene per sentence. Mix text treatments with diagrams. Do not let consecutive scenes become only chip lists.

### 5. Build the composition

From the project directory:

```powershell
npm run build
```

The build reads `data/storyboard.json`, generates `index.html`, and registers one paused GSAP master timeline. Fix storyboard validation errors instead of bypassing them.

### 6. Verify before review

Read [qa-and-render.md](references/qa-and-render.md), then:

```powershell
npm run check
```

Require:

- zero errors and zero warnings;
- no unintended layout overlaps;
- readable contrast;
- valid audio and video tracks;
- exact sequential reveals at representative word timestamps.

Capture three proof groups:

1. An early multi-item reveal.
2. A diagram-heavy middle scene.
3. The recap or final sequence.

Use at least 5–6 timestamps per progressive sequence.

### 7. Obtain preview approval

Start HyperFrames Studio only after checks pass:

```powershell
npm run dev
```

Hand the user the full Studio project URL. Do not render merely because checks pass. Wait for explicit approval such as `render V2`.

### 8. Render and verify

After approval, close Studio to release browser resources and render:

```powershell
npm run render:gpu -- --output "output/<name>-gpu.mp4" --browser-timeout 120
```

Keep 30 fps unless the source or user explicitly requires otherwise. Use high quality and GPU/NVENC.

After render:

1. Confirm the MP4 is non-empty.
2. Verify H.264 video, AAC audio, 1080×1920, 30 fps, and plausible duration with `ffprobe`.
3. Decode the complete file with FFmpeg at error log level.
4. Extract representative frames from the final MP4, not only from Studio snapshots.
5. Recompute the source SHA-256 and confirm it is unchanged.

## Assets and scripts

- `scripts/scaffold.ps1`: create a safe reusable project.
- `scripts/scaffold.mjs`: canonical cross-platform scaffolder.
- `scripts/build.mjs`: compile storyboard scenes and keyframes into `index.html`.
- `scripts/self-test.mjs`: verify scaffold safety, privacy, and build gates.
- `assets/starter/index.template.html`: approved top-down visual system.
- `assets/fonts/`: Be Vietnam Pro 600/700/800/900.
- `assets/vendor/gsap.min.js`: local seek-safe animation runtime.
- `THIRD_PARTY_NOTICES.md`: font and GSAP attribution and license boundaries.

## Completion contract

Report:

- final MP4 path;
- resolution, fps, duration, size, video/audio codecs;
- scene count and timed reveal count;
- final verification contact sheet;
- source and output SHA-256;
- any caveat that remains.

Never delete the project or older renders unless the user explicitly asks.
