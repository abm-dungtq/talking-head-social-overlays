import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const storyboardText = await readFile(resolve(root, "data/storyboard.json"), "utf8");
const storyboard = JSON.parse(storyboardText.replace(/^\uFEFF/, ""));
const template = await readFile(resolve(root, "index.template.html"), "utf8");
const output = resolve(root, "index.html");

const composition = storyboard.composition || {};
const compositionId = composition.id || "talking-head-social-overlays";
const duration = Number(composition.durationSeconds);
const fps = Number(composition.fps || 30);
const width = Number(composition.width || 1080);
const height = Number(composition.height || 1920);
const videoSource = storyboard.videoTrack?.sourcePath || "assets/video/source.mp4";
const supportedAccents = new Set(["cyan", "orange", "lime", "violet", "gold"]);
const supportedTemplates = new Set([
  "hero-orbit", "chapter", "chapter-contrast", "chip-cloud", "funnel", "balance",
  "meters", "network", "chapter-network", "repository", "dependency", "query",
  "identity-morph", "lifecycle", "output-scale", "freedom", "roles", "workflow",
  "commander", "opc", "team-replace", "recap", "roadmap"
]);
const supportedEffects = new Set([
  "pop", "waterfall", "slide-left", "slide-right", "file", "step", "pillar", "drop",
  "flip", "slam", "danger", "glitch", "marker", "type", "scatter", "vault",
  "assemble", "weight", "grow", "node", "check", "break", "cross", "fade-task",
  "connect", "glow", "pulse", "lock"
]);
const exactItemCounts = new Map([
  ["funnel", 5],
  ["balance", 2],
  ["repository", 5],
  ["output-scale", 2],
  ["workflow", 4],
  ["team-replace", 3],
  ["roadmap", 5],
]);
const minimumItemCounts = new Map([
  ["hero-orbit", 1],
  ["chapter", 1],
  ["chapter-contrast", 1],
  ["chip-cloud", 1],
  ["meters", 2],
  ["network", 2],
  ["chapter-network", 2],
  ["dependency", 3],
  ["query", 3],
  ["identity-morph", 3],
  ["lifecycle", 3],
  ["freedom", 4],
  ["roles", 2],
  ["commander", 2],
  ["opc", 2],
  ["recap", 3],
]);
const maximumItemCounts = new Map([
  ["hero-orbit", 6],
  ["chapter", 2],
  ["chapter-contrast", 5],
  ["chip-cloud", 9],
  ["meters", 5],
  ["network", 4],
  ["chapter-network", 4],
  ["query", 6],
  ["identity-morph", 5],
  ["lifecycle", 7],
  ["freedom", 6],
  ["roles", 4],
  ["opc", 5],
  ["recap", 6],
]);
const allowDraft = process.argv.includes("--allow-draft");

if (!/^[a-z0-9-]+$/.test(compositionId)) throw new Error("composition.id must use lowercase letters, digits, and hyphens");
if (!(duration > 0)) throw new Error("composition.durationSeconds must be greater than zero");
if (fps !== 30) throw new Error("This workflow is calibrated for composition.fps = 30");
if (width !== 1080 || height !== 1920) throw new Error("This workflow requires a 1080x1920 portrait composition");
if (storyboard.schemaVersion !== 2) throw new Error("storyboard.schemaVersion must be 2");
if (!["draft", "ready"].includes(storyboard.status)) throw new Error("storyboard.status must be draft or ready");
if (storyboard.status !== "ready" && !allowDraft) {
  throw new Error("Storyboard is still draft. Set status to ready after editorial review, or use npm run build:draft for a scaffold preview.");
}
if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) {
  throw new Error("storyboard.scenes must contain at least one scene");
}
if (!/^assets\/video\/[a-zA-Z0-9._-]+\.mp4$/.test(videoSource)) {
  throw new Error("videoTrack.sourcePath must be a project-relative MP4 inside assets/video");
}
if (storyboard.videoTrack && Object.hasOwn(storyboard.videoTrack, "originalPath")) {
  throw new Error("Remove videoTrack.originalPath; absolute source paths must not be stored in the project");
}
if (
  storyboard.safeArea?.top !== 140 ||
  storyboard.safeArea?.contentBottom !== 900 ||
  storyboard.safeArea?.platformBottom !== 420
) {
  throw new Error("safeArea must be top=140, contentBottom=900, platformBottom=420");
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validateScene(scene, index) {
  if (!/^[a-z0-9-]+$/.test(scene.id)) throw new Error("Invalid scene id at " + index);
  if (typeof scene.title !== "string" || !scene.title.trim()) throw new Error("Missing title for " + scene.id);
  if (typeof scene.kicker !== "string" || !scene.kicker.trim()) throw new Error("Missing kicker for " + scene.id);
  if (!supportedAccents.has(scene.accent)) throw new Error("Unsupported accent for " + scene.id + ": " + scene.accent);
  if (!supportedTemplates.has(scene.template)) throw new Error("Unsupported template for " + scene.id + ": " + scene.template);
  if (!(scene.start >= 0 && scene.end > scene.start && scene.end <= storyboard.composition.durationSeconds)) {
    throw new Error("Invalid time range for " + scene.id);
  }
  if (!Array.isArray(scene.items)) throw new Error("Missing items for " + scene.id);
  const exactCount = exactItemCounts.get(scene.template);
  if (exactCount !== undefined && scene.items.length !== exactCount) {
    throw new Error(`${scene.template} requires exactly ${exactCount} items in ${scene.id}`);
  }
  const minimumCount = minimumItemCounts.get(scene.template);
  if (minimumCount !== undefined && scene.items.length < minimumCount) {
    throw new Error(`${scene.template} requires at least ${minimumCount} items in ${scene.id}`);
  }
  const maximumCount = maximumItemCounts.get(scene.template);
  if (maximumCount !== undefined && scene.items.length > maximumCount) {
    throw new Error(`${scene.template} supports at most ${maximumCount} items in ${scene.id}`);
  }
  if (!(scene.titleAt >= scene.start && scene.titleAt < scene.end)) throw new Error("Invalid titleAt for " + scene.id);
  const finalTitleReveal = scene.titleAt + Math.max(0, scene.title.trim().split(/\s+/).length - 1) * 0.055;
  if (finalTitleReveal >= scene.end) throw new Error("Title reveal extends outside scene " + scene.id);
  for (const item of scene.items) {
    if (typeof item.text !== "string" || !item.text.trim()) throw new Error("Empty item text in " + scene.id);
    if (!(item.at >= scene.start && item.at < scene.end)) throw new Error("Item outside scene " + scene.id + ": " + item.text);
    if (!supportedEffects.has(item.effect || "pop")) throw new Error("Unsupported effect for " + scene.id + ": " + item.effect);
  }
  if (scene.center) {
    if (!["network", "chapter-network"].includes(scene.template)) {
      throw new Error("center is only valid for network templates in " + scene.id);
    }
    if (typeof scene.center.text !== "string" || !scene.center.text.trim()) throw new Error("Empty center text in " + scene.id);
    if (!(scene.center.at >= scene.start && scene.center.at < scene.end)) throw new Error("Center outside scene " + scene.id);
    if (!supportedEffects.has(scene.center.effect || "slam")) throw new Error("Unsupported center effect in " + scene.id);
  }
  if (scene.template === "commander") {
    const hubCount = scene.items.filter((item) => item.effect === "slam").length;
    const nodeCount = scene.items.filter((item) => !["slam", "glow"].includes(item.effect)).length;
    if (hubCount !== 1 || nodeCount < 1 || nodeCount > 4) {
      throw new Error("commander requires exactly one slam hub and 1-4 nodes in " + scene.id);
    }
  }
  if (scene.caption !== undefined && (typeof scene.caption !== "string" || !scene.caption.trim())) {
    throw new Error("caption must be a non-empty string in " + scene.id);
  }
}

function revealAttrs(scene, item, index, extraClass) {
  const classes = ["reveal", extraClass || "", item.effect === "marker" ? "marker-item" : "", item.effect === "danger" ? "danger-item" : ""].filter(Boolean).join(" ");
  return 'id="' + scene.id + '-item-' + index + '" class="' + classes + '" data-reveal-at="' + item.at.toFixed(3) + '" data-effect="' + esc(item.effect || "pop") + '"';
}

function itemChip(scene, item, index, extraClass) {
  return "<div " + revealAttrs(scene, item, index, ["chip", extraClass || ""].filter(Boolean).join(" ")) + ">" + esc(item.text) + "</div>";
}

function renderTitle(scene) {
  const words = scene.title.split(/\s+/);
  return '<h2 class="scene-title">' + words.map((word, index) =>
    '<span id="' + scene.id + '-title-' + index + '" class="title-word reveal" data-reveal-at="' + (scene.titleAt + index * 0.055).toFixed(3) + '" data-effect="waterfall">' + esc(word) + "</span>"
  ).join(" ") + "</h2>";
}

function svgPath(scene, id, d, at) {
  return '<path id="' + scene.id + "-path-" + id + '" class="draw-path reveal" pathLength="1" d="' + d + '" data-reveal-at="' + Math.max(scene.start, at - 0.12).toFixed(3) + '" data-effect="draw"></path>';
}

function renderHeroOrbit(scene) {
  const first = scene.items[0];
  const core = '<div ' + revealAttrs(scene, first, 0, "hero-core") + ">" + esc(first.text) + "</div>";
  const orbit = scene.items.slice(1).map((item, index) => itemChip(scene, item, index + 1, "orbit-chip")).join("");
  return '<div class="visual-stage hero-orbit-stage">' + core + orbit + "</div>";
}

function renderChapter(scene) {
  const number = scene.items[0] || {text:"",at:scene.start,effect:"slam"};
  const badge = scene.items[1];
  return '<div class="visual-stage chapter-stage"><div ' + revealAttrs(scene, number, 0, "chapter-number") + ">" + esc(number.text) + "</div>" +
    (badge ? '<div ' + revealAttrs(scene, badge, 1, "chapter-badge") + ">" + esc(badge.text) + "</div>" : "") + "</div>";
}

function renderChipCloud(scene) {
  return '<div class="visual-stage chip-cloud">' + scene.items.map((item, index) => itemChip(scene, item, index)).join("") + "</div>";
}

function renderFunnel(scene) {
  const fragments = scene.items.slice(0, 3).map((item, index) => itemChip(scene, item, index, "fragment")).join("");
  const ai = itemChip(scene, scene.items[3], 3, "ai-core");
  const vault = itemChip(scene, scene.items[4], 4, "vault");
  const paths = svgPath(scene, "a", "M145 92 C250 185 390 195 480 260", scene.items[3].at) +
    svgPath(scene, "b", "M815 105 C710 190 580 202 480 260", scene.items[3].at) +
    svgPath(scene, "c", "M260 190 C330 220 400 235 480 260", scene.items[3].at) +
    svgPath(scene, "d", "M480 300 L480 390", scene.items[4].at);
  return '<div class="visual-stage funnel-stage"><svg class="funnel-svg" viewBox="0 0 960 540">' + paths + "</svg>" + fragments + ai + vault + "</div>";
}

function renderBalance(scene) {
  const left = scene.items[0], right = scene.items[1];
  return '<div class="visual-stage balance-stage"><div id="' + scene.id + '-beam" class="balance-beam"></div><div class="balance-pivot"></div>' +
    '<div ' + revealAttrs(scene, left, 0, "balance-card left") + ">" + esc(left.text) + "</div>" +
    '<div ' + revealAttrs(scene, right, 1, "balance-card right") + ">" + esc(right.text) + "</div></div>";
}

function renderMeters(scene) {
  const meters = scene.items.slice(0, -1).map((item, index) =>
    '<div ' + revealAttrs(scene, item, index, "meter") + '><div class="meter-fill"></div><div class="meter-label">' + esc(item.text) + "</div></div>"
  ).join("");
  const win = scene.items.at(-1);
  return '<div class="visual-stage meters-stage">' + meters + '<div ' + revealAttrs(scene, win, scene.items.length - 1, "meter-win") + ">" + esc(win.text) + "</div></div>";
}

function renderNetwork(scene, commander) {
  const nodes = scene.items.filter((item) => !["slam","glow"].includes(item.effect));
  const positions = [[100,100],[860,100],[480,450],[100,445]];
  if (nodes.length > positions.length) throw new Error("Network templates support at most 4 nodes in " + scene.id);
  const paths = nodes.map((item, index) => svgPath(scene, index, "M480 210 L" + positions[index][0] + " " + positions[index][1], item.at)).join("");
  const nodeMarkup = nodes.map((item, index) => {
    const cls = commander ? "commander-node c" + (index + 1) : "network-node n" + (index + 1);
    return '<div ' + revealAttrs(scene, item, scene.items.indexOf(item), cls) + ">" + esc(item.text) + "</div>";
  }).join("");
  const hubItem = commander
    ? scene.items.find((item) => item.effect === "slam")
    : (scene.center || { text: "TRUNG TÂM", at: scene.start + 0.1, effect: "slam" });
  if (!hubItem) throw new Error("Commander template requires one item with effect slam in " + scene.id);
  const hubIndex = commander ? scene.items.indexOf(hubItem) : "center";
  const hubText = esc(hubItem.text).replaceAll("\n", "<br>");
  const hub = '<div ' + revealAttrs(scene, hubItem, hubIndex, "hub") + ">" + hubText + "</div>";
  const glow = commander ? scene.items.find((item) => item.effect === "glow") : null;
  return '<div class="visual-stage ' + (commander ? "commander-stage" : "network-stage") + '"><svg class="' + (commander ? "commander-svg" : "network-svg") + '" viewBox="0 0 960 540">' + paths + "</svg>" + hub + nodeMarkup +
    (glow ? itemChip(scene, glow, scene.items.indexOf(glow), "workflow-output") : "") + "</div>";
}

function renderRepository(scene) {
  const files = scene.items.slice(0, 3).map((item, index) => itemChip(scene, item, index, "file-card")).join("");
  const vault = scene.items[3], brain = scene.items[4];
  return '<div class="visual-stage repository-stage"><div class="files">' + files + '</div><div class="repo-arrow">→</div><div class="repo-vault">' +
    '<div ' + revealAttrs(scene, vault, 3, "repo-icon") + ">▣</div>" +
    '<div ' + revealAttrs(scene, brain, 4, "repo-label") + ">" + esc(brain.text) + "</div></div></div>";
}

function renderDependency(scene) {
  const person = scene.items[0], leader = scene.items[1], priorities = scene.items.slice(2);
  return '<div class="visual-stage dependency-stage"><div class="person-card"><div ' + revealAttrs(scene, person, 0, "crossed") + ">" + esc(person.text) + "</div><div " + revealAttrs(scene, leader, 1, "") + ">" + esc(leader.text) + '</div></div><div class="broken-link">⛓</div><div class="priority-list">' +
    priorities.map((item, index) => itemChip(scene, item, index + 2)).join("") + "</div></div>";
}

function renderQuery(scene) {
  const ask = scene.items.slice(0, 2);
  const results = scene.items.slice(2);
  return '<div class="visual-stage query-stage"><div class="query-box"><span class="query-prompt">›</span>' +
    ask.map((item, index) => '<span ' + revealAttrs(scene, item, index, "") + ">" + esc(item.text) + "</span>").join('<span class="query-prompt">/</span>') +
    '</div><div class="query-results">' + results.map((item, index) => itemChip(scene, item, index + 2)).join("") + "</div></div>";
}

function renderIdentity(scene) {
  const old = scene.items.slice(0, 2), fresh = scene.items.slice(2);
  return '<div class="visual-stage identity-stage"><div class="identity-old">' + old.map((item, index) => itemChip(scene, item, index, "crossed")).join("") +
    '</div><div class="identity-new">' + fresh.map((item, index) => '<div ' + revealAttrs(scene, item, index + 2, "") + ">" + esc(item.text) + "</div>").join("") + "</div></div>";
}

function renderLifecycle(scene) {
  return '<div class="visual-stage lifecycle-stage">' + scene.items.map((item, index) => itemChip(scene, item, index, "life-step")).join("") + "</div>";
}

function renderOutput(scene) {
  return '<div class="visual-stage output-stage">' + scene.items.map((item, index) =>
    '<div ' + revealAttrs(scene, item, index, "output-card " + (index ? "secondary" : "")) + ">" + esc(item.text) + "</div>"
  ).join("") + "</div>";
}

function renderFreedom(scene) {
  const tasks = scene.items.slice(0, 2), ai = scene.items[2], future = scene.items.slice(3);
  return '<div class="visual-stage freedom-stage"><div class="task-stack">' + tasks.map((item, index) => itemChip(scene, item, index)).join("") +
    '</div><div class="freedom-arrow"><div ' + revealAttrs(scene, ai, 2, "") + ">→</div></div><div class=\"future-stack\">" +
    future.map((item, index) => itemChip(scene, item, index + 3)).join("") + "</div></div>";
}

function renderRoles(scene) {
  return '<div class="visual-stage roles-stage">' + scene.items.map((item, index) =>
    '<div ' + revealAttrs(scene, item, index, "role-node") + "><span>" + esc(item.text) + "</span></div>"
  ).join("") + "</div>";
}

function renderWorkflow(scene) {
  const agents = scene.items.slice(0, 3), out = scene.items[3];
  const flow = agents.map((item, index) => itemChip(scene, item, index)).join('<div class="flow-arrow">→</div>');
  return '<div class="visual-stage workflow-stage">' + flow + '<div ' + revealAttrs(scene, out, 3, "chip workflow-output") + ">" + esc(out.text) + "</div></div>";
}

function renderOpc(scene) {
  const leader = scene.items[0], stack = scene.items.slice(1);
  return '<div class="visual-stage opc-stage"><div class="opc-leader"><div ' + revealAttrs(scene, leader, 0, "opc-one") + ">1</div><div class=\"opc-caption\">" + esc(scene.caption || "LÃNH ĐẠO") + "</div></div><div class=\"opc-stack\">" +
    stack.map((item, index) => itemChip(scene, item, index + 1)).join("") + "</div></div>";
}

function renderTeam(scene) {
  const old = scene.items[0], leader = scene.items[1], digital = scene.items[2];
  return '<div class="visual-stage team-stage"><div class="human"><div ' + revealAttrs(scene, old, 0, "crossed") + ">" + esc(old.text) + '</div></div><div class="repo-arrow">→</div><div class="digital"><div ' +
    revealAttrs(scene, leader, 1, "") + ">" + esc(leader.text) + "</div><div " + revealAttrs(scene, digital, 2, "") + ">" + esc(digital.text) + "</div></div></div>";
}

function renderRecap(scene) {
  return '<div class="visual-stage recap-stage">' + scene.items.map((item, index) =>
    '<div ' + revealAttrs(scene, item, index, "recap-row") + ">" + esc(item.text) + "</div>"
  ).join("") + "</div>";
}

function renderRoadmap(scene) {
  const steps = scene.items.slice(0, 4), final = scene.items[4];
  return '<div class="visual-stage roadmap-stage">' + steps.map((item, index) =>
    '<div ' + revealAttrs(scene, item, index, "road-step") + ">" + esc(item.text) + "</div>"
  ).join("") + '<div ' + revealAttrs(scene, final, 4, "chip road-final") + ">" + esc(final.text) + "</div></div>";
}

function renderVisual(scene) {
  if (scene.template === "hero-orbit") return renderHeroOrbit(scene);
  if (scene.template === "chapter") return renderChapter(scene);
  if (scene.template === "chapter-contrast") return renderChipCloud(scene);
  if (scene.template === "chip-cloud") return renderChipCloud(scene);
  if (scene.template === "funnel") return renderFunnel(scene);
  if (scene.template === "balance") return renderBalance(scene);
  if (scene.template === "meters") return renderMeters(scene);
  if (["network","chapter-network"].includes(scene.template)) return renderNetwork(scene, false);
  if (scene.template === "repository") return renderRepository(scene);
  if (scene.template === "dependency") return renderDependency(scene);
  if (scene.template === "query") return renderQuery(scene);
  if (scene.template === "identity-morph") return renderIdentity(scene);
  if (scene.template === "lifecycle") return renderLifecycle(scene);
  if (scene.template === "output-scale") return renderOutput(scene);
  if (scene.template === "freedom") return renderFreedom(scene);
  if (scene.template === "roles") return renderRoles(scene);
  if (scene.template === "workflow") return renderWorkflow(scene);
  if (scene.template === "commander") return renderNetwork(scene, true);
  if (scene.template === "opc") return renderOpc(scene);
  if (scene.template === "team-replace") return renderTeam(scene);
  if (scene.template === "recap") return renderRecap(scene);
  if (scene.template === "roadmap") return renderRoadmap(scene);
  return renderChipCloud(scene);
}

function renderScene(scene, index) {
  validateScene(scene, index);
  return '<section id="scene-' + scene.id + '" class="clip scene accent-' + esc(scene.accent) + ' template-' + esc(scene.template) + '" data-start="' + scene.start.toFixed(3) + '" data-duration="' + (scene.end - scene.start).toFixed(3) + '" data-track-index="' + (index + 1) + '">' +
    '<div class="scene-shell"><div id="' + scene.id + '-kicker" class="scene-kicker reveal" data-reveal-at="' + (scene.start + 0.05).toFixed(3) + '" data-effect="drop">' + esc(scene.kicker) + "</div>" +
    renderTitle(scene) + renderVisual(scene) + "</div></section>";
}

const seenSceneIds = new Set();
let previousSceneEnd = -1;
for (const [index, scene] of storyboard.scenes.entries()) {
  if (seenSceneIds.has(scene.id)) throw new Error("Duplicate scene id: " + scene.id);
  if (scene.start < previousSceneEnd) throw new Error("Scenes must be ordered and cannot overlap: " + scene.id);
  seenSceneIds.add(scene.id);
  previousSceneEnd = scene.end;
  validateScene(scene, index);
}

const scenes = storyboard.scenes.map(renderScene).join("\n      ");
const timeline = [
  'document.querySelectorAll(".scene").forEach(function(scene){',
  '  const start = Number(scene.dataset.start);',
  '  const duration = Number(scene.dataset.duration);',
  '  const shell = "#" + scene.id + " .scene-shell";',
  '  tl.fromTo(shell,{opacity:0,y:-16},{opacity:1,y:0,duration:.24,ease:"power2.out",immediateRender:false},start);',
  '  tl.to(shell,{opacity:0,y:-12,duration:.20,ease:"power2.in"},start+duration-.20);',
  '});',
  'document.querySelectorAll("[data-reveal-at]").forEach(function(el,index){',
  '  const at = Number(el.dataset.revealAt);',
  '  const effect = el.dataset.effect || "pop";',
  '  const sel = "#" + el.id;',
  '  const common = {opacity:1,x:0,y:0,scale:1,rotation:0,rotationX:0,duration:.42,ease:"power3.out",immediateRender:false};',
  '  if(effect==="draw"){ tl.fromTo(sel,{opacity:1,strokeDashoffset:1},{opacity:1,strokeDashoffset:0,duration:.58,ease:"power2.inOut",immediateRender:false},at); return; }',
  '  if(effect==="waterfall"){ tl.fromTo(sel,{opacity:0,y:-28,scale:.96},{opacity:1,y:0,scale:1,duration:.38,ease:"power4.out",immediateRender:false},at); return; }',
  '  if(effect==="slide-left"||effect==="file"||effect==="step"||effect==="pillar"){ tl.fromTo(sel,{opacity:0,x:-90},{...common,duration:.45},at); return; }',
  '  if(effect==="slide-right"){ tl.fromTo(sel,{opacity:0,x:90},{...common,duration:.45},at); return; }',
  '  if(effect==="drop"){ tl.fromTo(sel,{opacity:0,y:-72,scale:.92},{...common,duration:.48,ease:"back.out(1.35)"},at); return; }',
  '  if(effect==="flip"){ tl.fromTo(sel,{opacity:0,rotationX:-88,scale:.82},{...common,duration:.52,ease:"back.out(1.4)"},at); return; }',
  '  if(effect==="slam"||effect==="danger"){ tl.fromTo(sel,{opacity:0,y:-32,scale:1.65},{...common,duration:.34,ease:"power4.out"},at); tl.to(sel,{scale:1.06,duration:.10,ease:"power1.inOut"},at+.34); tl.to(sel,{scale:1,duration:.13,ease:"power2.out"},at+.44); return; }',
  '  if(effect==="glitch"){ tl.fromTo(sel,{opacity:0,x:-18,scale:1.22,rotation:-2},{...common,duration:.18,ease:"steps(3)"},at); tl.to(sel,{x:10,rotation:1,duration:.08,ease:"steps(2)"},at+.18); tl.to(sel,{x:0,rotation:0,duration:.11,ease:"power2.out"},at+.26); return; }',
  '  if(effect==="marker"||effect==="type"){ tl.fromTo(sel,{opacity:1,clipPath:"inset(0 100% 0 0)",x:-10},{opacity:1,clipPath:"inset(0 0% 0 0)",x:0,duration:.52,ease:"power3.out",immediateRender:false},at); return; }',
  '  if(effect==="scatter"){ const dir=index%2===0?-1:1; tl.fromTo(sel,{opacity:0,x:dir*160,y:-45,rotation:dir*7,scale:.72},{...common,duration:.58,ease:"back.out(1.2)"},at); return; }',
  '  if(effect==="vault"||effect==="assemble"){ tl.fromTo(sel,{opacity:0,scale:.25,rotationX:-55,y:45},{...common,duration:.65,ease:"back.out(1.6)"},at); return; }',
  '  if(effect==="weight"){ tl.fromTo(sel,{opacity:0,y:-95,scale:.7},{...common,duration:.62,ease:"bounce.out"},at); return; }',
  '  if(effect==="grow"){ tl.fromTo(sel,{opacity:0,x:-55},{...common,duration:.34},at); const fill=sel+" .meter-fill"; if(document.querySelector(fill)) tl.fromTo(fill,{scaleX:0},{scaleX:1,duration:.72,ease:"power3.out",immediateRender:false},at+.08); return; }',
  '  if(effect==="node"||effect==="check"){ tl.fromTo(sel,{opacity:0,scale:.25,y:24},{...common,duration:.48,ease:"back.out(1.7)"},at); return; }',
  '  if(effect==="break"||effect==="cross"){ tl.fromTo(sel,{opacity:0,scale:.6,rotation:-8},{...common,duration:.40,ease:"back.out(1.4)"},at); tl.to(sel,{x:8,duration:.08,ease:"steps(2)"},at+.42); tl.to(sel,{x:0,duration:.10},at+.50); return; }',
  '  if(effect==="fade-task"){ tl.fromTo(sel,{opacity:0,x:-75},{...common,duration:.38},at); tl.to(sel,{opacity:.32,x:-12,duration:.35,ease:"power2.in"},at+2.2); return; }',
  '  if(effect==="connect"||effect==="glow"){ tl.fromTo(sel,{opacity:0,scale:.72},{...common,duration:.45,ease:"back.out(1.5)"},at); tl.to(sel,{scale:1.06,duration:.24,yoyo:true,repeat:3,ease:"sine.inOut"},at+.5); return; }',
  '  if(effect==="pulse"){ tl.fromTo(sel,{opacity:0,scale:.4},{...common,duration:.42,ease:"back.out(1.6)"},at); tl.to(sel,{scale:1.08,duration:.25,yoyo:true,repeat:4,ease:"sine.inOut"},at+.45); return; }',
  '  if(effect==="lock"){ tl.fromTo(sel,{opacity:0,scale:1.25},{...common,duration:.34,ease:"power4.out"},at); return; }',
  '  tl.fromTo(sel,{opacity:0,y:32,scale:.72},{...common,duration:.44,ease:"back.out(1.45)"},at);',
  '});',
  ...storyboard.scenes.filter((scene) => scene.template === "balance").map((scene) =>
    'tl.fromTo("#' + scene.id + '-beam",{rotation:5},{rotation:-7,duration:.72,ease:"power2.inOut",immediateRender:false},' +
    Number((scene.items[1]?.at || scene.start + 0.7).toFixed(3)) + ');'
  ),
  ...storyboard.scenes.filter((scene) => scene.template === "funnel" && scene.items.length >= 4).map((scene) =>
    'tl.to("#scene-' + scene.id + ' .fragment",{x:function(i){return i===1?-250:250;},y:155,scale:.56,opacity:.36,duration:.65,ease:"power2.inOut"},' +
    Number(scene.items[3].at.toFixed(3)) + ');'
  )
].join("\n");

const html = template
  .replaceAll("{{TITLE}}", esc(storyboard.title || "Talking Head Social Overlays"))
  .replaceAll("{{COMPOSITION_ID}}", compositionId)
  .replaceAll("{{DURATION}}", duration.toFixed(3))
  .replaceAll("{{FPS}}", String(fps))
  .replaceAll("{{WIDTH}}", String(width))
  .replaceAll("{{HEIGHT}}", String(height))
  .replaceAll("{{VIDEO_SOURCE}}", esc(videoSource))
  .replace("<!-- SCENES -->", scenes)
  .replace("/* TIMELINE */", timeline)
  .replace("data-template-composition-id", "data-composition-id");

if (/{{[A-Z_]+}}|<!-- SCENES -->|\/\* TIMELINE \*\//.test(html)) {
  throw new Error("Build left an unresolved template placeholder");
}

await writeFile(output, html, "utf8");
process.stdout.write("Built " + compositionId + " with " + storyboard.scenes.length + " scenes and " + storyboard.scenes.reduce((sum, scene) => sum + scene.items.length, 0) + " timed reveals.\n");
