/**
 * DBDle — Perk Tagger for Connections game mode
 *
 * Fetches all perks from dbd.tricky.lol/api/perks (both roles),
 * enriches each with semantic tags via keyword matching on the description,
 * and writes data/perks-tagged.json.
 *
 * Usage:
 *   npx tsx scripts/tag-perks.mts
 *   npx tsx scripts/tag-perks.mts --dry-run   # print stats only
 *
 * Output: data/perks-tagged.json
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiPerk {
  name: string;
  description: string;
  role: "killer" | "survivor";
  character: number; // character index from API (0 = original / teachable from base roster)
  categories: string[];
  tunables?: string[][];
  teachable?: number;
  image?: string;
}

interface ApiPerksResponse {
  [id: string]: ApiPerk;
}

// Characters API to resolve character index → name/origin
interface ApiCharacter {
  id: number;
  name: string;
  role: string;
  dlc?: string; // present for licensed characters
}

type MechanicTag =
  | "generator"
  | "hook"
  | "chase"
  | "heal"
  | "totem"
  | "chest"
  | "aura"
  | "noise"
  | "speed"
  | "exhausted"
  | "oblivious"
  | "exposed"
  | "blind"
  | "hindered"
  | "broken";

type TimingTag =
  | "on_hook"
  | "on_unhook"
  | "on_heal"
  | "on_chase_start"
  | "on_chase_end"
  | "on_down"
  | "on_rescue"
  | "endgame"
  | "passive";

type OwnerTag =
  | "original_survivor"
  | "licensed_survivor"
  | "original_killer"
  | "licensed_killer";

type MetaTag = "hex" | "obsession" | "map_wide" | "stackable" | "basekit_candidate";

type PerkTag = MechanicTag | TimingTag | OwnerTag | MetaTag;

interface TaggedPerk {
  id: string;
  name: string;
  description: string;
  owner: string | null;
  role: "killer" | "survivor";
  tags: PerkTag[];
  needs_review: boolean;
}

// ── Keyword → tag mapping ─────────────────────────────────────────────────────
// Each entry: [regex pattern, tag]
// Evaluated against the plain-text description (HTML stripped, lowercased).

const MECHANIC_RULES: [RegExp, MechanicTag][] = [
  // generator
  [/\bgenerat(?:ors?|ing|ion|e)\b/i, "generator"],
  [/\brepairing\b/i, "generator"],
  [/\brepair(?:ing)?\s+progress\b/i, "generator"],

  // hook
  [/\bhooks?\b/i, "hook"],
  [/\bsacrifice\b/i, "hook"],

  // chase
  [/\bchase\b/i, "chase"],
  [/\bchasing\b/i, "chase"],
  [/\bpursuit\b/i, "chase"],
  [/\bline\s+of\s+sight\b/i, "chase"],
  [/\blose\s+sight\b/i, "chase"],

  // heal
  [/\bheal(?:ing|th\s+state)?\b/i, "heal"],
  [/\bmed(?:ical)?\s+kit\b/i, "heal"],
  [/\binjured\b/i, "heal"],
  [/\brecovery\b/i, "heal"],

  // totem
  [/\btotems?\b/i, "totem"],
  [/\bdull\s+totems?\b/i, "totem"],
  [/\bnullified\b/i, "totem"],
  [/\bhex\s+totems?\b/i, "totem"],
  [/\bcleanse\b/i, "totem"],
  [/\bbless(?:ing|ed)?\b/i, "totem"],

  // chest
  [/\bchests?\b/i, "chest"],
  [/\bitems?\b/i, "chest"],
  [/\badd-?ons?\b/i, "chest"],

  // aura
  [/\bauras?\b/i, "aura"],
  [/\bseen\b.*\bauras?\b/i, "aura"],
  [/\bvision\b/i, "aura"],

  // noise
  [/\bnoise\b/i, "noise"],
  [/\bscratch\s+mark\b/i, "noise"],
  [/\bgroan(?:ing)?\b/i, "noise"],
  [/\bhearing\b/i, "noise"],

  // speed
  [/\bhaste\b/i, "speed"],
  [/\bmovement\s+speed\b/i, "speed"],
  [/\bsprint\b/i, "speed"],
  [/\bvault(?:ing)?\s+speed\b/i, "speed"],
  [/\brepair\s+speed\b/i, "speed"],
  [/\bsearch\s+speed\b/i, "speed"],
  [/\bhealing\s+speed\b/i, "speed"],

  // exhausted
  [/\bexhaust(?:ed|ion)?\b/i, "exhausted"],

  // oblivious
  [/\boblivious\b/i, "oblivious"],
  [/\bterror\s+radius\b/i, "oblivious"],

  // exposed
  [/\bexposed\b/i, "exposed"],
  [/\bone-?hit\b/i, "exposed"],
  [/\binstant\s+down\b/i, "exposed"],

  // blind
  [/\bblind(?:ed|ness)?\b/i, "blind"],
  [/\bflashlight\b/i, "blind"],

  // hindered
  [/\bhindered\b/i, "hindered"],
  [/\bslowed?\b/i, "hindered"],

  // broken
  [/\bbroken\b/i, "broken"],
  [/\bcannot\s+be\s+healed\b/i, "broken"],
];

const TIMING_RULES: [RegExp, TimingTag][] = [
  [/\bwhen\s+(?:a\s+)?survivor\s+is\s+hooked\b/i, "on_hook"],
  [/\bwhen\s+you\s+are\s+hooked\b/i, "on_hook"],
  [/\bhooked\s+for\s+the\s+(?:first|second|third)\b/i, "on_hook"],
  [/\bwhen\s+a\s+survivor\s+is\s+put\s+in(?:to)?\s+the\s+dying\b/i, "on_down"],

  [/\bwhen\s+you\s+unhook\b/i, "on_unhook"],
  [/\bwhen\s+rescued\b/i, "on_unhook"],
  [/\bafter\s+being\s+unhooked\b/i, "on_unhook"],
  [/\bafter\s+unhooking\b/i, "on_unhook"],
  [/\bon\s+the\s+ground\s+after\s+being\s+unhooked\b/i, "on_unhook"],
  [/\bborrow(?:ed)?\s+time\b/i, "on_unhook"], // BT is named after the rescue window

  [/\bwhen\s+(?:you\s+)?(?:heal|mend)\b/i, "on_heal"],
  [/\bafter\s+(?:performing\s+a\s+)?heal\b/i, "on_heal"],
  [/\bwhen\s+you\s+are\s+healed\b/i, "on_heal"],
  [/\bwhen\s+finishing\s+a\s+heal\b/i, "on_heal"],
  [/\bon\s+(?:a\s+)?successful\s+heal\b/i, "on_heal"],

  [/\bwhen\s+a\s+chase\s+begins\b/i, "on_chase_start"],
  [/\bwhen\s+you\s+are\s+spotted\b/i, "on_chase_start"],
  [/\bwhen\s+the\s+killer\s+first\s+(?:hits|sees)\s+you\b/i, "on_chase_start"],

  [/\bwhen\s+a\s+chase\s+ends\b/i, "on_chase_end"],
  [/\bafter\s+a\s+chase\b/i, "on_chase_end"],
  [/\bbreak(?:ing)?\s+line\s+of\s+sight\b/i, "on_chase_end"],

  [/\bput(?:ting)?\s+a\s+survivor\s+into\s+the\s+dying\b/i, "on_down"],
  [/\bwhen\s+you\s+down\b/i, "on_down"],
  [/\bsurvivor\s+falls\s+to\s+the\s+ground\b/i, "on_down"],

  [/\brescue\b/i, "on_rescue"],
  [/\bsafe\s+unhook\b/i, "on_rescue"],

  [/\bexit\s+gate(?:s)?\s+(?:are\s+)?power(?:ed)?\b/i, "endgame"],
  [/\bwhen\s+the\s+exit\s+gates\b/i, "endgame"],
  [/\bendgame\s+collapse\b/i, "endgame"],
  [/\blast\s+generator\b/i, "endgame"],
  [/\ball\s+generators\s+(?:are\s+)?(?:repaired|powered|done)\b/i, "endgame"],
  [/\badrenaline\b/i, "endgame"],

  [/\bpassively\b/i, "passive"],
  [/\bat\s+all\s+times\b/i, "passive"],
  [/\bthroughout\s+the\s+trial\b/i, "passive"],
  [/\bpermanently\b/i, "passive"],
  [/\balways\s+active\b/i, "passive"],
];

const META_RULES: [RegExp, MetaTag][] = [
  [/\bhex\b/i, "hex"],
  [/\btotem\s+is\s+(?:cleansed|destroyed|snuffed)\b/i, "hex"],

  [/\bobsession\b/i, "obsession"],

  [/\bwithin\s+\d+\s+metres?\s+of\s+all\b/i, "map_wide"],
  [/\banywhere\s+on\s+the\s+map\b/i, "map_wide"],
  [/\breveals\s+the\s+auras?\s+of\s+all\b/i, "map_wide"],

  [/\bstacks?\b/i, "stackable"],
  [/\bfor\s+each\b/i, "stackable"],
  [/\bper\s+(?:generator|hook|survivor)\b/i, "stackable"],
  [/\bcumulatively\b/i, "stackable"],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Replace {0}, {1}… placeholders with "X" so regexes still work */
function normalizeTunables(desc: string): string {
  return desc.replace(/\{(\d+)\}/g, "X");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function fetchPerks(role: "killer" | "survivor"): Promise<ApiPerksResponse> {
  const url = `https://dbd.tricky.lol/api/perks?role=${role}`;
  console.log(`  📡 GET ${url}`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "DBDle-tagger/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<ApiPerksResponse>;
    } catch (err) {
      if (attempt === 3) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`     ⚠  attempt ${attempt} failed (${msg}), retrying…`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error("unreachable");
}

async function fetchCharacters(): Promise<ApiCharacter[]> {
  const url = "https://dbd.tricky.lol/api/characters";
  console.log(`  📡 GET ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "DBDle-tagger/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Characters API HTTP ${res.status}`);
  const data = (await res.json()) as ApiCharacter[] | Record<string, ApiCharacter>;
  return Array.isArray(data) ? data : Object.values(data);
}

// ── Tag inference ─────────────────────────────────────────────────────────────

function inferTags(desc: string): { tags: PerkTag[]; needsReview: boolean } {
  const plain = normalizeTunables(stripHtml(desc));

  const mechanic = new Set<MechanicTag>();
  for (const [rx, tag] of MECHANIC_RULES) {
    if (rx.test(plain)) mechanic.add(tag);
  }

  const timing = new Set<TimingTag>();
  for (const [rx, tag] of TIMING_RULES) {
    if (rx.test(plain)) timing.add(tag);
  }
  // Fallback: if no timing found, mark passive (always-on or unclear)
  if (timing.size === 0) timing.add("passive");

  const meta = new Set<MetaTag>();
  for (const [rx, tag] of META_RULES) {
    if (rx.test(plain)) meta.add(tag);
  }

  const tags: PerkTag[] = [
    ...Array.from(mechanic).sort(),
    ...Array.from(timing).sort(),
    ...Array.from(meta).sort(),
  ];

  // needs_review = no mechanic tags found (description probably too vague)
  const needsReview = mechanic.size === 0;

  return { tags, needsReview };
}

// ── Owner resolution ──────────────────────────────────────────────────────────

/**
 * Build a map: characterIndex → { name, isLicensed }
 * The tricky.lol API uses numeric `character` field (index into roster).
 * Index 0 typically means "no specific owner" (teachable from everyone).
 */
function buildCharacterMap(chars: ApiCharacter[]): Map<number, { slug: string; isLicensed: boolean }> {
  const map = new Map<number, { slug: string; isLicensed: boolean }>();
  for (const c of chars) {
    map.set(c.id, {
      slug: slugify(c.name),
      isLicensed: Boolean(c.dlc && c.dlc !== ""),
    });
  }
  return map;
}

function ownerTag(role: "killer" | "survivor", isLicensed: boolean): OwnerTag {
  if (role === "survivor") return isLicensed ? "licensed_survivor" : "original_survivor";
  return isLicensed ? "licensed_killer" : "original_killer";
}

// ── Main ──────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, "../perks-tagged.json");

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log("\n🏷️  DBDle Perk Tagger\n");

  // Fetch all data in parallel
  console.log("📡 Fetching data…");
  const [survivorRaw, killerRaw, characters] = await Promise.all([
    fetchPerks("survivor"),
    fetchPerks("killer").catch((err) => {
      console.warn(`  ⚠  Killer perk API unavailable (${err.message}), skipping killer perks`);
      return {} as ApiPerksResponse;
    }),
    fetchCharacters().catch((err) => {
      console.warn(`  ⚠  Characters API unavailable (${err.message}), owner tags will be null`);
      return [] as ApiCharacter[];
    }),
  ]);

  const charMap = buildCharacterMap(characters);

  const allRaw: [string, ApiPerk][] = [
    ...Object.entries(killerRaw),
    ...Object.entries(survivorRaw),
  ];

  console.log(`\n🔍 Tagging ${allRaw.length} perks…\n`);

  const tagged: TaggedPerk[] = [];
  let needsReviewCount = 0;

  for (const [id, perk] of allRaw) {
    const charInfo = charMap.get(perk.character);
    const owner = charInfo?.slug ?? null;
    const isLicensed = charInfo?.isLicensed ?? false;

    const { tags, needsReview } = inferTags(perk.description ?? "");

    // Prepend owner tag
    const ownerT = ownerTag(perk.role, isLicensed);
    const allTags: PerkTag[] = [ownerT, ...tags];

    if (needsReview) needsReviewCount++;

    tagged.push({
      id,
      name: perk.name,
      description: stripHtml(perk.description ?? ""),
      owner,
      role: perk.role,
      tags: allTags,
      needs_review: needsReview,
    });
  }

  // Sort alphabetically by name
  tagged.sort((a, b) => a.name.localeCompare(b.name));

  // Stats
  const survivorCount = tagged.filter((p) => p.role === "survivor").length;
  const killerCount = tagged.filter((p) => p.role === "killer").length;
  const tagFreq = new Map<string, number>();
  for (const p of tagged) {
    for (const t of p.tags) {
      tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, n]) => `${tag}: ${n}`)
    .join(", ");

  console.log(`✅ Tagged ${tagged.length} perks (${killerCount} killer, ${survivorCount} survivor)`);
  console.log(`⚠️  Needs review: ${needsReviewCount} perks`);
  console.log(`📊 Top tags: ${topTags}\n`);

  if (isDryRun) {
    console.log("--dry-run: skipping file write.");
    return;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    total: tagged.length,
    totalKiller: killerCount,
    totalSurvivor: survivorCount,
    needsReview: needsReviewCount,
    perks: tagged,
  };

  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`💾 Written to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("💥 Fatal:", err);
  process.exit(1);
});
