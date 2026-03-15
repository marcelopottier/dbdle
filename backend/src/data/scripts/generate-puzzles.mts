/**
 * DBDle — Connections Puzzle Generator (OpenAI)
 *
 * Reads perks-tagged.json and calls the OpenAI API to generate daily puzzles.
 *
 * Usage:
 *   npx tsx src/data/scripts/generate-puzzles.mts --days 7 --start 2026-03-13
 *   npx tsx src/data/scripts/generate-puzzles.mts --days 30
 *   npx tsx src/data/scripts/generate-puzzles.mts --date 2026-04-01   # single date
 *
 * Requirements:
 *   OPENAI_API_KEY in .env or environment
 *
 * Output:
 *   src/data/puzzles/YYYY-MM-DD.json  (skips dates that already exist)
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import OpenAI from "openai";
import "dotenv/config";

// ── Config ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend root (4 levels up: scripts → data → src → backend)
const envPath = path.resolve(__dirname, "../../../../.env");
try {
  const envContent = await fs.readFile(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // .env not found, rely on environment variables
}
const PUZZLES_DIR = path.resolve(__dirname, "../puzzles");
const PERKS_FILE = path.resolve(__dirname, "../perks-tagged.json");

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaggedPerk {
  id: string;
  name: string;
  description: string;
  owner: string | null;
  role: "killer" | "survivor";
  tags: string[];
  needs_review: boolean;
}

interface PuzzleGroup {
  theme: string;
  color: "yellow" | "green" | "blue" | "purple";
  difficulty: 1 | 2 | 3 | 4;
  perks: [string, string, string, string];
}

interface Puzzle {
  date: string;
  groups: [PuzzleGroup, PuzzleGroup, PuzzleGroup, PuzzleGroup];
}

// ── Load perks ────────────────────────────────────────────────────────────────

const require = createRequire(import.meta.url);
const { perks: allPerks } = require(PERKS_FILE) as { perks: TaggedPerk[] };

// Build a compact perk list for the prompt (name + tags + short description)
function buildPerkContext(perks: TaggedPerk[]): string {
  return perks
    .map(p => {
      const mechTags = p.tags.filter(t =>
        !t.includes("_survivor") && !t.includes("_killer") && t !== "passive"
      );
      return `- ${p.name} [${mechTags.join(", ")}]: ${p.description.slice(0, 120)}`;
    })
    .join("\n");
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

// ── Previously used perks (to avoid repeating across puzzles) ─────────────────

async function loadUsedPerks(): Promise<Set<string>> {
  const used = new Set<string>();
  const files = await fs.readdir(PUZZLES_DIR).catch(() => [] as string[]);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(PUZZLES_DIR, f), "utf-8");
      const puzzle = JSON.parse(raw) as Puzzle;
      for (const g of puzzle.groups) {
        for (const p of g.perks) used.add(p);
      }
    } catch {
      // ignore malformed files
    }
  }
  return used;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Dead by Daylight expert and puzzle designer.
Your task is to create a Connections-style puzzle (like NYT Connections) using DBD perks.

Rules:
1. Each puzzle has exactly 4 groups of exactly 4 perks each (16 total).
2. Each group has a hidden theme connecting all 4 perks.
3. Difficulty 1 (yellow) = obvious theme. Difficulty 4 (purple) = very subtle/tricky.
4. Themes must be accurate — every perk in the group must genuinely fit.
5. No perk appears in more than one group.
6. Prefer thematic variety: mix mechanics (e.g., generators, hooks, chases) with meta categories (e.g., perks with a number in the name, perks that use the word "spirit").
7. Avoid trivially obvious groups like "all hex perks" — be creative with the framing.
8. Use only perks from the provided list.

Output ONLY valid JSON matching this exact schema (no explanation, no markdown):
{
  "date": "YYYY-MM-DD",
  "groups": [
    { "theme": "...", "color": "yellow", "difficulty": 1, "perks": ["Perk A", "Perk B", "Perk C", "Perk D"] },
    { "theme": "...", "color": "green",  "difficulty": 2, "perks": ["Perk E", "Perk F", "Perk G", "Perk H"] },
    { "theme": "...", "color": "blue",   "difficulty": 3, "perks": ["Perk I", "Perk J", "Perk K", "Perk L"] },
    { "theme": "...", "color": "purple", "difficulty": 4, "perks": ["Perk M", "Perk N", "Perk O", "Perk P"] }
  ]
}`;

function buildUserPrompt(date: string, avoidPerks: Set<string>): string {
  // Pick perks not used recently
  const available = allPerks.filter(p => !avoidPerks.has(p.name));
  // If too few available, fall back to full pool
  const pool = available.length >= 40 ? available : allPerks;

  const context = buildPerkContext(pool);

  return `Generate a Connections puzzle for date: ${date}

Available perks (name [mechanic tags]: short description):
${context}

${avoidPerks.size > 0 ? `\nTry to avoid reusing these recently used perks:\n${[...avoidPerks].slice(0, 40).join(", ")}\n` : ""}

Generate the puzzle now. Output only JSON.`;
}

// ── Validate puzzle ───────────────────────────────────────────────────────────

const COLORS: PuzzleGroup["color"][] = ["yellow", "green", "blue", "purple"];
const DIFFS = [1, 2, 3, 4] as const;

function validatePuzzle(raw: unknown, date: string): Puzzle {
  if (typeof raw !== "object" || raw === null) throw new Error("Not an object");

  const p = raw as Record<string, unknown>;
  if (!Array.isArray(p.groups) || p.groups.length !== 4) {
    throw new Error(`Expected 4 groups, got ${Array.isArray(p.groups) ? p.groups.length : "non-array"}`);
  }

  const usedPerks = new Set<string>();
  const perkNameSet = new Set(allPerks.map(p => p.name));

  const groups: PuzzleGroup[] = p.groups.map((g: unknown, i: number) => {
    if (typeof g !== "object" || g === null) throw new Error(`Group ${i} not an object`);
    const grp = g as Record<string, unknown>;

    if (typeof grp.theme !== "string" || !grp.theme.trim()) {
      throw new Error(`Group ${i} missing theme`);
    }
    if (!COLORS.includes(grp.color as PuzzleGroup["color"])) {
      throw new Error(`Group ${i} invalid color: ${grp.color}`);
    }
    if (!DIFFS.includes(grp.difficulty as 1 | 2 | 3 | 4)) {
      throw new Error(`Group ${i} invalid difficulty: ${grp.difficulty}`);
    }
    if (!Array.isArray(grp.perks) || grp.perks.length !== 4) {
      throw new Error(`Group ${i} must have exactly 4 perks`);
    }

    for (const name of grp.perks) {
      if (typeof name !== "string") throw new Error(`Group ${i}: perk name is not string`);
      if (!perkNameSet.has(name)) {
        // Fuzzy: try to find close match
        const close = allPerks.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!close) throw new Error(`Group ${i}: unknown perk "${name}"`);
        (grp.perks as string[])[grp.perks.indexOf(name)] = close.name;
      }
      if (usedPerks.has(name)) throw new Error(`Duplicate perk across groups: "${name}"`);
      usedPerks.add(name);
    }

    return grp as unknown as PuzzleGroup;
  });

  // Ensure correct color assignment (yellow=1, green=2, blue=3, purple=4)
  const colorMap: Record<number, PuzzleGroup["color"]> = { 1: "yellow", 2: "green", 3: "blue", 4: "purple" };
  for (const g of groups) {
    g.color = colorMap[g.difficulty];
  }

  // Sort by difficulty
  groups.sort((a, b) => a.difficulty - b.difficulty);

  return {
    date,
    groups: groups as Puzzle["groups"],
  };
}

// ── Generate single puzzle ────────────────────────────────────────────────────

async function generatePuzzle(
  client: OpenAI,
  date: string,
  usedPerks: Set<string>,
  attempt = 1
): Promise<Puzzle> {
  const MAX_ATTEMPTS = 3;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.9,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(date, usedPerks) },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON from API:\n${raw.slice(0, 300)}`);
  }

  try {
    return validatePuzzle(parsed, date);
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      console.log(`    ⚠  Validation failed (${(err as Error).message}), retry ${attempt + 1}/${MAX_ATTEMPTS}…`);
      return generatePuzzle(client, date, usedPerks, attempt + 1);
    }
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Parse CLI args
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const today = new Date().toISOString().slice(0, 10);
  const startArg = getArg("--start") ?? getArg("--date") ?? today;
  const daysArg = getArg("--date") ? "1" : (getArg("--days") ?? "7");
  const days = parseInt(daysArg, 10);
  const dryRun = args.includes("--dry-run");

  if (isNaN(days) || days < 1) {
    console.error("Invalid --days value");
    process.exit(1);
  }

  const dates = dateRange(startArg, days);

  // Check API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not set");
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  console.log(`\n🎮 DBDle Puzzle Generator\n`);
  console.log(`  Model   : gpt-4o`);
  console.log(`  Dates   : ${dates[0]} → ${dates[dates.length - 1]} (${dates.length} puzzle${dates.length > 1 ? "s" : ""})`);
  console.log(`  Perks   : ${allPerks.length} available`);
  console.log(`  Output  : ${PUZZLES_DIR}\n`);

  if (dryRun) {
    console.log("--dry-run: would generate puzzles for:", dates.join(", "));
    return;
  }

  // Ensure output dir
  await fs.mkdir(PUZZLES_DIR, { recursive: true });

  // Load previously used perks to encourage variety
  const usedPerks = await loadUsedPerks();
  console.log(`  Already used perks: ${usedPerks.size}\n`);

  let generated = 0;
  let skipped = 0;

  for (const date of dates) {
    const outFile = path.join(PUZZLES_DIR, `${date}.json`);

    // Skip if already exists
    try {
      await fs.access(outFile);
      console.log(`  ⏭  ${date} — already exists, skipping`);
      skipped++;
      continue;
    } catch {
      // file doesn't exist, proceed
    }

    process.stdout.write(`  🎯 ${date} — generating… `);

    try {
      const puzzle = await generatePuzzle(client, date, usedPerks);

      // Add newly used perks to the set
      for (const g of puzzle.groups) {
        for (const p of g.perks) usedPerks.add(p);
      }

      await fs.writeFile(outFile, JSON.stringify(puzzle, null, 2), "utf-8");

      const themes = puzzle.groups.map(g => `"${g.theme}"`).join(", ");
      console.log(`✅`);
      console.log(`     Themes: ${themes}`);

      generated++;

      // Small delay to avoid rate limits when generating many puzzles
      if (dates.indexOf(date) < dates.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.log(`❌`);
      console.error(`     Error: ${(err as Error).message}`);
    }
  }

  console.log(`\n✅ Done — ${generated} generated, ${skipped} skipped\n`);
}

main().catch(err => {
  console.error("💥 Fatal:", err);
  process.exit(1);
});
