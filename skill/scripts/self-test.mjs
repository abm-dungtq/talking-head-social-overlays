#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const skillRoot = resolve(import.meta.dirname, "..");
const testRoot = await mkdtemp(join(tmpdir(), "talking-head-social-overlays-"));
const source = join(testRoot, "source.mp4");
const project = join(testRoot, "project");

function run(command, args, expectedStatus = 0, cwd = testRoot) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    cwd,
  });
  if (result.error?.code === "ENOENT") throw new Error(`${command} was not found on PATH`);
  if (result.status !== expectedStatus) {
    throw new Error(
      `${command} exited ${result.status}, expected ${expectedStatus}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result;
}

try {
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", "color=c=black:s=360x640:r=30:d=2",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
    source,
  ]);

  run("node", [
    join(skillRoot, "scripts", "scaffold.mjs"),
    "--video", source,
    "--project", project,
    "--title", "Self Test",
    "--id", "self-test",
  ]);

  const storyboardPath = join(project, "data", "storyboard.json");
  const storyboard = JSON.parse(await readFile(storyboardPath, "utf8"));
  if (storyboard.schemaVersion !== 2) throw new Error("Unexpected storyboard schema version");
  if (storyboard.videoTrack.originalPath) throw new Error("Scaffold leaked an absolute source path");
  if (!/^[a-f0-9]{64}$/.test(storyboard.videoTrack.sourceSha256)) {
    throw new Error("Scaffold did not record a valid source SHA-256");
  }

  run("node", [join(project, "scripts", "build.mjs")], 1, project);
  run("node", [join(project, "scripts", "build.mjs"), "--allow-draft"], 0, project);

  storyboard.status = "ready";
  await writeFile(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
  run("node", [join(project, "scripts", "build.mjs")], 0, project);

  const html = await readFile(join(project, "index.html"), "utf8");
  if (html.includes("{{") || html.includes("<!-- SCENES -->") || html.includes("/* TIMELINE */")) {
    throw new Error("Generated HTML contains unresolved placeholders");
  }

  const secondScaffold = run("node", [
    join(skillRoot, "scripts", "scaffold.mjs"),
    "--video", source,
    "--project", project,
  ], 1);
  if (!secondScaffold.stderr.includes("not empty")) {
    throw new Error("Scaffold overwrite guard did not report the expected error");
  }

  process.stdout.write("Self-test passed: scaffold, privacy guard, draft gate, build, and overwrite guard.\n");
} finally {
  await rm(testRoot, { recursive: true, force: true });
}
