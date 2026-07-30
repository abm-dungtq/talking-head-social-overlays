# QA and render reference

## Contents

1. Check gate
2. Progressive timing proof
3. Social-safe review
4. Preview approval
5. GPU render
6. Final verification
7. Post-delivery cleanup

## Check gate

Run `npm run build`, then `npm run check`.

Fix:

- runtime errors;
- missing local assets or fonts;
- timed elements without clipping;
- overlaps that obscure text or faces;
- contrast warnings;
- invalid or unresolved timeline registrations.

Information-only `pointer-events: none` findings are acceptable for decorative scrims and SVG paths.

## Progressive timing proof

For a scene with multiple concepts, capture snapshots immediately after each transcript anchor:

```powershell
npx --yes hyperframes@0.7.83 snapshot . `
  --at 25.5,27.2,30.2,33.6,36.2,37.8 `
  --output "output/proof/progressive" `
  --no-end `
  --describe false
```

Review the contact sheet and confirm:

- frame 1 contains only the first spoken item;
- each later frame adds only the newly mentioned item;
- no future item appears early;
- the final frame contains the complete visual.

Also capture 6–8 isolated visual templates from the full timeline.

## Social-safe review

At every representative scene confirm:

- first baseline begins below `y=140`;
- main content ends by `y=900`;
- the lower `420px` contains no overlay;
- important text does not sit under likely TikTok/Reels/Shorts controls;
- the speaker's eyes and mouth remain readable;
- title, diagram, and speaker form a clear top-to-bottom hierarchy.

## Preview approval

Start Studio after checks:

```powershell
npm run dev -- --port 3017
```

Use:

```text
http://localhost:3017/#project/<project-folder-name>
```

Wait for explicit approval. Close Studio before final render.

## GPU render

```powershell
$env:PRODUCER_BROWSER_GPU_MODE = "hardware"
npm run render:gpu -- `
  --output "output/<name>-gpu.mp4" `
  --browser-timeout 120
```

If automatic workers risk exceeding the V8 heap, use `--workers 5` or set an appropriate `NODE_OPTIONS` heap limit. Do not restart a healthy render merely because the CLI prints a capacity warning.

## Final verification

Probe:

```powershell
ffprobe -v error `
  -show_entries format=duration,size,bit_rate `
  -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels `
  -of json `
  -- "output/<name>-gpu.mp4"
```

Decode the complete file:

```powershell
ffmpeg -hide_banner -v error `
  -i "output/<name>-gpu.mp4" `
  -map 0:v:0 -map 0:a:0 `
  -f null NUL
```

Extract 5–8 timestamps from the final MP4 into a contact sheet. Include early key text, a diagram, a lifecycle/list, a commander/workflow scene, recap, and outro.

Compute SHA-256 for:

- the original source;
- the staged source;
- the final MP4.

The original and staged hashes must match.

## Post-delivery cleanup

Preserve:

- the canonical final MP4;
- the final verification contact sheet;
- `data/`, `scripts/`, `assets/`, templates, manifests, and project configuration;
- the staged source video;
- any artifact the user explicitly names.

Default cleanup may remove:

- `.frames-cache/`, `.npm-cache/`, `.hf-tmp/`, `.thumbnails/`, `.waveform-cache/`, and `node_modules/`;
- abandoned `.hf-transaction-*` directories;
- snapshot, proof, frame, and font-review directories.

Run `npm run cleanup` without `--apply`, report its JSON target list and size, and obtain approval before applying. Removing older renders requires `--prune-output` plus one or more explicit `--keep` paths. The script refuses output pruning without a keep list.
