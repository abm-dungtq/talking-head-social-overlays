# Storyboard and template reference

## Contents

1. Storyboard schema
2. Timing rules
3. Template catalog
4. Effect catalog
5. Density and layout rules

## Storyboard schema

`data/storyboard.json` drives the composition:

```json
{
  "schemaVersion": 2,
  "status": "ready",
  "title": "Tên video",
  "composition": {
    "id": "talking-head-topic",
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "durationSeconds": 120.5,
    "layout": "portrait"
  },
  "safeArea": {
    "top": 140,
    "contentBottom": 900,
    "platformBottom": 420
  },
  "videoTrack": {
    "sourcePath": "assets/video/source.mp4"
  },
  "scenes": [
    {
      "id": "core-idea",
      "start": 10.2,
      "end": 20.8,
      "kicker": "Ý CHÍNH",
      "title": "TRI THỨC DOANH NGHIỆP",
      "titleAt": 10.35,
      "accent": "cyan",
      "template": "chip-cloud",
      "items": [
        { "text": "DỮ LIỆU", "at": 11.1, "effect": "drop" },
        { "text": "THÔNG TIN", "at": 12.8, "effect": "slide-left" }
      ]
    }
  ]
}
```

Constraints:

- Scene IDs use lowercase letters, digits, and hyphens.
- `start < titleAt < end`.
- Every `item.at` stays inside its scene.
- Scenes must be ordered and may touch, but cannot overlap.
- The production build requires `status: "ready"`; `npm run build:draft` is only for inspecting the generated placeholder.
- `videoTrack.sourcePath` must remain a project-relative MP4 under `assets/video/`.
- Use absolute seconds from the source transcript.

Network templates may define a timed center label without hard-coded business language:

```json
{
  "template": "network",
  "center": {
    "text": "TRUNG TÂM TRI THỨC",
    "at": 12.1,
    "effect": "slam"
  }
}
```

The `opc` template may define `caption`; if omitted, the renderer uses its built-in Vietnamese leader label.

## Timing rules

- Title: 0.10–0.25 seconds before the phrase, or exactly at its first word.
- Key text: at the first word naming the concept.
- Diagram path: 0.05–0.15 seconds before the destination node appears.
- Hold completed items until the scene ends unless editorial meaning requires replacement.
- Use 0.35–0.65 second entrances.
- Keep one dominant motion event at a time.
- Use finite pulses only; never use infinite repeats.

## Template catalog

| Template | Best use | Expected item shape |
|---|---|---|
| `hero-orbit` | Hook with one central idea and satellites | core + 2–5 satellites |
| `chapter` | Numbered chapter divider | number + short badge |
| `chapter-contrast` | Chapter title with contrasted claims | 2–5 chips |
| `chip-cloud` | Compact taxonomy or components | 3–9 short items |
| `funnel` | Many inputs become one asset/output | 3 inputs + processor + output |
| `balance` | Compare tangible and digital value | exactly 2 sides |
| `meters` | Several benefits build toward a win | 2–4 meters + outcome |
| `network` | Hub connects departments or actors | 2–4 nodes |
| `chapter-network` | Chapter plus connected system | 2–4 nodes |
| `repository` | Files flow into a knowledge base | 3 files + vault + label |
| `dependency` | Break dependency and redirect priorities | old dependency + owner + outcomes |
| `query` | Ask AI and receive grounded results | prompt parts + 1–4 results |
| `identity-morph` | Old identity becomes new identity | 2 old + 1–3 new |
| `lifecycle` | Ordered HR or process stages | 3–7 steps |
| `output-scale` | Compare two output levels | 2 primary cards |
| `freedom` | Routine tasks shift to strategic work | tasks + arrow + future work |
| `roles` | AI role specialization | 2–4 role nodes |
| `workflow` | Agents operate in a sequence | 3 agents + output |
| `commander` | Central controller orchestrates agents | 2–4 nodes + hub/output |
| `opc` | One-person-company model | leader + 2–4 supporting layers |
| `team-replace` | Traditional team becomes digital team | old + leader + digital team |
| `recap` | Sequential recap | 3–6 rows |
| `roadmap` | Journey or implementation path | 4 steps + final state |

Do not select a template only because its item count fits. The spatial metaphor must match the spoken claim.

## Effect catalog

| Effect | Use |
|---|---|
| `waterfall` | title words |
| `drop` | top-down arrival |
| `slide-left`, `slide-right` | related items entering from sides |
| `flip` | identity or category switch |
| `slam` | decisive number or claim |
| `glitch` | AI/technical emphasis |
| `marker`, `type` | highlighted key text |
| `scatter` | fragmented inputs |
| `vault`, `assemble` | consolidated asset/output |
| `weight` | value or comparison |
| `grow` | meter/progress |
| `node`, `connect` | network diagrams |
| `check`, `lock` | completion or control |
| `break`, `cross` | remove old process/dependency |
| `fade-task` | de-emphasize routine work |
| `glow`, `pulse` | finite emphasis |

Use 2–3 repeated effects per chapter for visual coherence.

## Density and layout rules

- Keep titles to 2 lines when possible.
- Keep chips under roughly 22 Vietnamese characters when possible.
- Use no more than 4 chips on one row.
- Prefer 5–7 visible elements in the safe band.
- Split dense content into multiple timed scenes rather than shrinking text.
- Keep the bottom 420px empty even when the speaker's legs or chair are visible there.
- If the speaker's head rises into the safe band, use side nodes or a shallow top row instead of covering the face.
