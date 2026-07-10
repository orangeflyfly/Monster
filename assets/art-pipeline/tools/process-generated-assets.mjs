import fs from "node:fs/promises";
import path from "node:path";

const sharp = (await import("sharp")).default;

const repo =
  globalThis.nodeRepl?.cwd ??
  globalThis.process?.cwd?.() ??
  "C:\\Users\\T24024\\Documents\\Monster Workshop";
const homeDir =
  globalThis.nodeRepl?.homeDir ??
  globalThis.process?.env?.USERPROFILE ??
  "C:\\Users\\T24024";
const generatedDir = path.join(
  homeDir,
  ".codex",
  "generated_images",
  "019efd8f-4643-72e2-a345-94a3f19b427e"
);

const generated = [
  "ig_09a75b65e9ba2445016a3cd20814dc819993ba535937a19735.png",
  "ig_09a75b65e9ba2445016a3cd2af79dc8199b37effa38bc271e3.png",
  "ig_09a75b65e9ba2445016a3cd350913c81999be6f6c2b5cc0925.png",
  "ig_09a75b65e9ba2445016a3cd3976cd88199b599c8865e3bf517.png",
  "ig_09a75b65e9ba2445016a3cd3e932248199bb070ede20161518.png",
  "ig_09a75b65e9ba2445016a3cd43b8d608199a3fb803c62d9e2c9.png",
  "ig_09a75b65e9ba2445016a3cd47e1ab081998978f02620a0a4b7.png",
  "ig_0cf67aa72469c879016a3cd524a57c8196a6bd70c01af14ebf.png",
  "ig_0cf67aa72469c879016a3cd5659ee481969a0a13428fd0f4b8.png",
  "ig_0cf67aa72469c879016a3cd5a72b888196a44d34b4d6e7eb7a.png",
];

const monsterAssets = [
  {
    id: "grassSpirit",
    slug: "grass_spirit",
    displayName: "grass spirit",
    file: "monster_grass_spirit_sheet.png",
    raw: generated[0],
    specialty: "farming",
    tool: "small hoe / watering tool",
  },
  {
    id: "goblin",
    slug: "goblin",
    displayName: "goblin",
    file: "monster_goblin_sheet.png",
    raw: generated[1],
    specialty: "logging",
    tool: "woodcutting axe",
  },
  {
    id: "stoneMonster",
    slug: "stone_golem",
    displayName: "stone golem",
    file: "monster_stone_golem_sheet.png",
    raw: generated[2],
    specialty: "mining",
    tool: "pickaxe",
  },
  {
    id: "wolfDog",
    slug: "wolf_hound",
    displayName: "wolf hound",
    file: "monster_wolf_hound_sheet.png",
    raw: generated[3],
    specialty: "hunting",
    tool: "short hunting hatchet / hunting gear",
  },
  {
    id: "kappa",
    slug: "kappa",
    displayName: "kappa",
    file: "monster_kappa_sheet.png",
    raw: generated[4],
    specialty: "fishing",
    tool: "fishing rod / net",
  },
];

const mapAssets = [
  { id: "farm", displayName: "Farm", raw: generated[5], file: "farm_production_map.png" },
  { id: "forest", displayName: "Forest", raw: generated[6], file: "forest_production_map.png" },
  { id: "mine", displayName: "Mine", raw: generated[7], file: "mine_production_map.png" },
  { id: "hunting", displayName: "HuntingGround", raw: generated[8], file: "hunting_ground_production_map.png" },
  { id: "lake", displayName: "Lake", raw: generated[9], file: "lake_production_map.png" },
];

const monsterLayout = {
  cellWidth: 32,
  cellHeight: 32,
  columns: 6,
  rows: 7,
  width: 192,
  height: 224,
  actions: [
    { id: "walk_down", row: 0, frames: 4 },
    { id: "walk_left", row: 1, frames: 4 },
    { id: "walk_up", row: 2, frames: 4 },
    { id: "walk_right", row: 3, frames: 4 },
    { id: "work", row: 4, frames: 6 },
    { id: "rest", row: 5, frames: 4 },
    { id: "exhausted", row: 6, frames: 6 },
  ],
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, value) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function chromaKeyMagenta(input, output, width, height) {
  const raw = await sharp(input)
    .resize(width, height, { fit: "fill", kernel: "nearest" })
    .ensureAlpha()
    .raw()
    .toBuffer();

  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];
    const magentaDistance = Math.abs(r - 255) + Math.abs(g - 0) + Math.abs(b - 255);
    const isMagenta = magentaDistance < 130 || (r > 205 && b > 205 && g < 95);
    if (isMagenta) raw[i + 3] = 0;
  }

  await sharp(raw, { raw: { width, height, channels: 4 } }).png().toFile(output);
}

async function extractFrames(sheet, outDir) {
  await ensureDir(outDir);
  const frames = [];
  for (const action of monsterLayout.actions) {
    for (let col = 0; col < action.frames; col += 1) {
      const name = `${action.id}_${String(col + 1).padStart(2, "0")}.png`;
      const file = path.join(outDir, name);
      await sharp(sheet)
        .extract({
          left: col * monsterLayout.cellWidth,
          top: action.row * monsterLayout.cellHeight,
          width: monsterLayout.cellWidth,
          height: monsterLayout.cellHeight,
        })
        .png()
        .toFile(file);
      frames.push({ action: action.id, frame: col, file: path.relative(repo, file).replaceAll("\\", "/") });
    }
  }
  return frames;
}

function monsterPrompt(asset) {
  return [
    `Monster Sprite Pipeline raw prompt for ${asset.displayName}.`,
    "Pixel art monster animation spritesheet for a cozy camp management game.",
    "Top-down / three-quarter view from slightly above.",
    `Specialty: ${asset.specialty}. Tool: ${asset.tool}.`,
    "Layout: 7 rows x 6 columns. Rows 1-4 are walk down/left/up/right, 4 frames each. Row 5 work, 6 frames. Row 6 rest, 4 frames. Row 7 exhausted, 6 frames.",
    "Solid #FF00FF magenta background, no UI, no text, no borders.",
  ].join("\n");
}

async function processMonsters() {
  for (const asset of monsterAssets) {
    const outDir = path.join(repo, "assets", "sprites", "monsters", asset.slug);
    const framesDir = path.join(outDir, "frames");
    const qcDir = path.join(outDir, "qc");
    await ensureDir(qcDir);

    const rawSource = path.join(generatedDir, asset.raw);
    const rawOut = path.join(outDir, asset.file.replace("_sheet.png", "_raw.png"));
    const sheetOut = path.join(outDir, asset.file);
    const promptOut = path.join(outDir, asset.file.replace(".png", ".prompt.txt"));
    const metaOut = path.join(outDir, asset.file.replace(".png", ".metadata.json"));
    const qcOut = path.join(qcDir, asset.file.replace(".png", ".qc.json"));

    await fs.copyFile(rawSource, rawOut);
    await chromaKeyMagenta(rawSource, sheetOut, monsterLayout.width, monsterLayout.height);
    const frames = await extractFrames(sheetOut, framesDir);
    await fs.writeFile(promptOut, `${monsterPrompt(asset)}\n`, "utf8");

    const metadata = {
      assetId: `monster:${asset.id}:workshop_sheet`,
      monsterId: asset.id,
      slug: asset.slug,
      file: path.relative(repo, sheetOut).replaceAll("\\", "/"),
      rawSource: path.relative(repo, rawOut).replaceAll("\\", "/"),
      cell: { width: 32, height: 32 },
      sheet: { columns: 6, rows: 7, width: 192, height: 224 },
      background: "transparent",
      sourceBackground: "#FF00FF",
      view: "topdown_3_4",
      actions: monsterLayout.actions.map((action) => ({
        id: action.id,
        row: action.row,
        frames: action.frames,
        columns: [...Array(action.frames).keys()],
      })),
      frames,
      pipeline: "Monster Sprite Pipeline",
      qcStatus: "needs_manual_animation_review",
    };
    await writeJson(metaOut, metadata);
    await writeJson(qcOut, {
      status: "processed",
      checks: {
        fileExists: true,
        fixedCellSize: true,
        transparentBackground: true,
        generatedGridPrecision: "manual_review_required",
        actionReadability: "manual_review_required",
      },
      notes: [
        "Image generation created the raw art source; this pass normalized it to 32x32 cells.",
        "Review each row for pose consistency before runtime integration.",
      ],
    });
  }
}

function mapPrompt(asset) {
  return [
    `Map Generation Pipeline raw prompt for ${asset.displayName}.`,
    "Complete production area map for a cozy monster workshop management game.",
    "Pixel art, cute, clear, top-down / slightly angled overhead view.",
    "Target canvas: 1280x720. No UI, no text, no labels, no border, no characters.",
  ].join("\n");
}

async function processMaps() {
  for (const asset of mapAssets) {
    const outDir = path.join(repo, "assets", "maps", "production", asset.id);
    const qcDir = path.join(outDir, "qc");
    await ensureDir(qcDir);

    const rawSource = path.join(generatedDir, asset.raw);
    const rawOut = path.join(outDir, asset.file.replace(".png", "-raw.png"));
    const mapOut = path.join(outDir, asset.file);
    const promptOut = path.join(outDir, asset.file.replace(".png", ".prompt.txt"));
    const metaOut = path.join(outDir, asset.file.replace(".png", ".metadata.json"));
    const qcOut = path.join(qcDir, asset.file.replace(".png", ".qc.json"));

    await fs.copyFile(rawSource, rawOut);
    await sharp(rawSource)
      .resize(1280, 720, { fit: "cover", position: "center", kernel: "nearest" })
      .png()
      .toFile(mapOut);
    await fs.writeFile(promptOut, `${mapPrompt(asset)}\n`, "utf8");

    await writeJson(metaOut, {
      assetId: `production-map:${asset.id}`,
      mapId: asset.id,
      displayName: asset.displayName,
      file: path.relative(repo, mapOut).replaceAll("\\", "/"),
      rawSource: path.relative(repo, rawOut).replaceAll("\\", "/"),
      canvas: { width: 1280, height: 720, unit: "px" },
      perspective: "topdown_3_4",
      artStyle: "cute_pixel_art_management_map",
      deliverableType: "complete_composite_png",
      requiredContent: [
        "main ground surface",
        "theme decoration",
        "monster activity space",
        "initial work positions",
        "future expansion space",
        "facility slot visual language",
      ],
      layeredStatus: "composite_only_first_pass",
      pipeline: "Map Generation Pipeline",
      qcStatus: "needs_manual_layout_review",
    });
    await writeJson(qcOut, {
      status: "processed",
      checks: {
        fileExists: true,
        canvas1280x720: true,
        noRuntimeHook: true,
        layeredSeparation: "not_done_in_first_pass",
      },
      notes: [
        "This first pass outputs the requested complete composite map PNG.",
        "Future layered pass should regenerate foundation-only base, decor layer, and preview separately.",
      ],
    });
  }
}

await processMonsters();
await processMaps();

console.log("Processed Monster Workshop generated art assets.");
