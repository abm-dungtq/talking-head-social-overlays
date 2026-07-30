#!/usr/bin/env node

import {
  access,
  copyFile,
  cp,
  link,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

function usage() {
  return [
    "Usage:",
    "  node scaffold.mjs --video <source.mp4> --project <directory>",
    "                    [--title <title>] [--id <composition-id>]",
    "",
    "The target directory must be new or empty. Existing files are never overwritten.",
  ].join("\n");
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    values[key.slice(2)] = value;
    index += 1;
  }
  return values;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function probeVideo(path) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,r_frame_rate",
      "-show_entries", "format=duration",
      "-of", "json",
      "--",
      path,
    ],
    { encoding: "utf8", shell: false },
  );
  if (result.error?.code === "ENOENT") {
    throw new Error("ffprobe was not found. Install FFmpeg and add it to PATH.");
  }
  if (result.status !== 0) {
    throw new Error(`ffprobe could not read the input video: ${result.stderr.trim()}`);
  }
  return JSON.parse(result.stdout);
}

async function stageVideo(source, destination) {
  try {
    await link(source, destination);
    return "hardlink";
  } catch (error) {
    if (!["EXDEV", "EPERM", "EACCES", "EMLINK"].includes(error.code)) throw error;
    await copyFile(source, destination);
    return "copy";
  }
}

async function main() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) throw new Error("Node.js 22 or newer is required.");

  const args = parseArgs(process.argv.slice(2));
  if (!args.video || !args.project) throw new Error(usage());

  const title = args.title || "Talking Head Social Video";
  const compositionId = args.id || "talking-head-social-video";
  if (!/^[a-z0-9-]+$/.test(compositionId)) {
    throw new Error("Composition id must use lowercase letters, digits, and hyphens.");
  }

  const sourceVideo = resolve(args.video);
  const sourceInfo = await stat(sourceVideo).catch(() => null);
  if (!sourceInfo?.isFile()) throw new Error(`Video does not exist: ${sourceVideo}`);
  if (extname(sourceVideo).toLowerCase() !== ".mp4") throw new Error("Video must be an MP4 file.");

  const target = resolve(args.project);
  const targetExists = await exists(target);
  if (targetExists) {
    const targetInfo = await stat(target);
    if (!targetInfo.isDirectory()) throw new Error(`Project target is not a directory: ${target}`);
    if ((await readdir(target)).length > 0) {
      throw new Error("Project target is not empty. Choose a new or empty directory.");
    }
  }

  const probe = probeVideo(sourceVideo);
  const duration = Number(probe.format?.duration);
  if (!(duration >= 1)) throw new Error("Input video must be at least one second long.");

  const skillRoot = resolve(import.meta.dirname, "..");
  const starter = join(skillRoot, "assets", "starter");
  const temporary = join(
    dirname(target),
    `.${basename(target)}.talking-head-social-overlays-${process.pid}`,
  );
  if (await exists(temporary)) throw new Error(`Temporary path already exists: ${temporary}`);

  try {
    await mkdir(join(temporary, "assets", "fonts"), { recursive: true });
    await mkdir(join(temporary, "assets", "vendor"), { recursive: true });
    await mkdir(join(temporary, "assets", "video"), { recursive: true });
    await mkdir(join(temporary, "data"), { recursive: true });
    await mkdir(join(temporary, "scripts"), { recursive: true });
    await mkdir(join(temporary, "output"), { recursive: true });

    await copyFile(join(starter, "index.template.html"), join(temporary, "index.template.html"));
    await copyFile(join(starter, "hyperframes.json"), join(temporary, "hyperframes.json"));
    await copyFile(join(starter, ".gitignore"), join(temporary, ".gitignore"));
    await copyFile(join(skillRoot, "scripts", "build.mjs"), join(temporary, "scripts", "build.mjs"));
    await cp(join(skillRoot, "assets", "fonts"), join(temporary, "assets", "fonts"), {
      recursive: true,
      force: false,
    });
    await copyFile(
      join(skillRoot, "assets", "vendor", "gsap.min.js"),
      join(temporary, "assets", "vendor", "gsap.min.js"),
    );

    const packageTemplate = JSON.parse(await readFile(join(starter, "package.json"), "utf8"));
    packageTemplate.name = compositionId;
    await writeFile(
      join(temporary, "package.json"),
      `${JSON.stringify(packageTemplate, null, 2)}\n`,
      "utf8",
    );

    const stagedVideo = join(temporary, "assets", "video", "source.mp4");
    const stageMode = await stageVideo(sourceVideo, stagedVideo);
    const sourceHash = await sha256(sourceVideo);
    const starterEnd = Math.min(duration, 8);
    const titleAt = Math.min(0.6, starterEnd - 0.2);
    const itemAt = Math.min(1.4, starterEnd - 0.1);
    const storyboard = {
      schemaVersion: 2,
      status: "draft",
      title,
      composition: {
        id: compositionId,
        fps: 30,
        width: 1080,
        height: 1920,
        durationSeconds: Number(duration.toFixed(3)),
        layout: "portrait",
      },
      safeArea: {
        top: 140,
        contentBottom: 900,
        platformBottom: 420,
      },
      videoTrack: {
        sourcePath: "assets/video/source.mp4",
        sourceFileName: basename(sourceVideo),
        sourceSha256: sourceHash,
        stageMode,
      },
      scenes: [
        {
          id: "starter",
          start: 0,
          end: Number(starterEnd.toFixed(3)),
          kicker: "DRAFT",
          title: "REPLACE WITH TRANSCRIPT-DRIVEN STORYBOARD",
          titleAt: Number(titleAt.toFixed(3)),
          accent: "cyan",
          template: "chip-cloud",
          items: [
            {
              text: "Reveal each idea at its exact spoken timestamp",
              at: Number(itemAt.toFixed(3)),
              effect: "marker",
            },
          ],
        },
      ],
    };
    await writeFile(
      join(temporary, "data", "storyboard.json"),
      `${JSON.stringify(storyboard, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(temporary, ".talking-head-social-overlays.json"),
      `${JSON.stringify({ schemaVersion: 1, sourceSha256: sourceHash }, null, 2)}\n`,
      "utf8",
    );

    if (targetExists) await rm(target);
    await rename(temporary, target);

    process.stdout.write(`${JSON.stringify({
      projectDir: target,
      video: join(target, "assets", "video", "source.mp4"),
      videoStageMode: stageMode,
      durationSeconds: Number(duration.toFixed(3)),
      storyboard: join(target, "data", "storyboard.json"),
    }, null, 2)}\n`);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
