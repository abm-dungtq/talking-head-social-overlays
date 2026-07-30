#!/usr/bin/env node

import {
  access,
  lstat,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import process from "node:process";

function usage() {
  return [
    "Usage:",
    "  node cleanup.mjs [--project <directory>] [--deep]",
    "                   [--prune-output --keep <output/path> ...]",
    "                   [--allow-legacy] [--apply]",
    "",
    "Without --apply this command is a dry-run and deletes nothing.",
    "Default cleanup removes only regenerable caches and proof-frame directories.",
    "--deep also removes the project-local .venv.",
    "--prune-output removes output artifacts except explicit --keep paths.",
  ].join("\n");
}

function parseArgs(argv) {
  const result = {
    project: ".",
    keep: [],
    apply: false,
    deep: false,
    pruneOutput: false,
    allowLegacy: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") result.apply = true;
    else if (token === "--deep") result.deep = true;
    else if (token === "--prune-output") result.pruneOutput = true;
    else if (token === "--allow-legacy") result.allowLegacy = true;
    else if (token === "--project" || token === "--keep") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
      if (token === "--project") result.project = value;
      else result.keep.push(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}\n${usage()}`);
    }
  }
  return result;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel);
}

async function verifyProject(project, allowLegacy) {
  if (project === parse(project).root) throw new Error("Refusing to clean a filesystem root");
  const marker = join(project, ".talking-head-social-overlays.json");
  if (await exists(marker)) return "managed";
  if (!allowLegacy) {
    throw new Error("Project marker is missing. Use --allow-legacy only after verifying this is a talking-head HyperFrames project.");
  }
  const required = [
    join(project, "hyperframes.json"),
    join(project, "package.json"),
    join(project, "assets", "video", "source.mp4"),
  ];
  if (!(await Promise.all(required.map(exists))).every(Boolean)) {
    throw new Error("Legacy project verification failed; required HyperFrames files are missing");
  }
  const hyperframes = JSON.parse(await readFile(required[0], "utf8"));
  if (!String(hyperframes.$schema || "").includes("hyperframes")) {
    throw new Error("Legacy project verification failed; hyperframes.json is not recognized");
  }
  return "legacy";
}

async function sizeOf(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink() || info.isFile()) return info.size;
  if (!info.isDirectory()) return 0;
  let total = 0;
  for (const entry of await readdir(path)) total += await sizeOf(join(path, entry));
  return total;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

async function collectOutputPrune(current, keepPaths, candidates) {
  const normalized = resolve(current);
  if (keepPaths.has(normalized)) return;
  const containsKeep = [...keepPaths].some((keep) => isInside(normalized, keep));
  if (!containsKeep) {
    candidates.add(normalized);
    return;
  }
  const info = await lstat(normalized);
  if (!info.isDirectory() || info.isSymbolicLink()) return;
  for (const child of await readdir(normalized)) {
    await collectOutputPrune(join(normalized, child), keepPaths, candidates);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = resolve(args.project);
  const identity = await verifyProject(project, args.allowLegacy);
  const outputRoot = join(project, "output");

  const keepPaths = new Set();
  for (const value of args.keep) {
    const absolute = resolve(project, value);
    if (!isInside(outputRoot, absolute) && absolute !== outputRoot) {
      throw new Error(`--keep must point inside the project output directory: ${value}`);
    }
    if (!(await exists(absolute))) throw new Error(`Kept path does not exist: ${value}`);
    keepPaths.add(absolute);
  }
  if (args.pruneOutput && keepPaths.size === 0) {
    throw new Error("--prune-output requires at least one explicit --keep path");
  }

  const candidates = new Set();
  const cacheNames = [
    ".frames-cache",
    ".npm-cache",
    ".hf-tmp",
    ".thumbnails",
    ".waveform-cache",
    "node_modules",
    "snapshots",
  ];
  if (args.deep) cacheNames.push(".venv");
  for (const name of cacheNames) {
    const candidate = join(project, name);
    if (await exists(candidate)) candidates.add(candidate);
  }

  if (await exists(outputRoot)) {
    if (args.pruneOutput) {
      for (const child of await readdir(outputRoot)) {
        await collectOutputPrune(join(outputRoot, child), keepPaths, candidates);
      }
    } else {
      const transientNames = new Set([
        "proof",
        "snapshots",
        "frames",
        "font-review",
        "tmp",
        "temp",
        "chunks",
        "intermediate",
      ]);
      for (const child of await readdir(outputRoot)) {
        if (
          transientNames.has(child) ||
          /(^|[-_.])proof($|[-_.])/.test(child) ||
          /^\.?.+\.hf-transaction-/.test(child)
        ) {
          candidates.add(join(outputRoot, child));
        }
      }
    }
  }

  const targets = [];
  for (const path of [...candidates].sort()) {
    if (!isInside(project, path)) throw new Error(`Unsafe cleanup target: ${path}`);
    if ([...keepPaths].some((keep) => keep === path || isInside(path, keep))) continue;
    if (!(await exists(path))) continue;
    targets.push({ path, bytes: await sizeOf(path) });
  }

  const totalBytes = targets.reduce((sum, target) => sum + target.bytes, 0);
  const report = {
    mode: args.apply ? "apply" : "dry-run",
    project,
    projectIdentity: identity,
    pruneOutput: args.pruneOutput,
    deep: args.deep,
    kept: [...keepPaths].map((path) => relative(project, path)),
    targets: targets.map((target) => ({
      path: relative(project, target.path),
      bytes: target.bytes,
      displaySize: formatBytes(target.bytes),
    })),
    recoverableBytes: totalBytes,
    displaySize: formatBytes(totalBytes),
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!args.apply) {
    process.stdout.write("Dry-run only. Re-run with --apply after reviewing the keep list and targets.\n");
    return;
  }

  for (const target of targets) {
    await rm(target.path, { recursive: true, force: false });
  }
  process.stdout.write(`Cleanup complete: removed ${targets.length} target(s), ${formatBytes(totalBytes)}.\n`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
