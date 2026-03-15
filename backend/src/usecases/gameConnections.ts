import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

import { NotFoundError } from "../errors/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawPerk {
  id: string;
  name: string;
  role: string;
  iconUrl: string | null;
}

export interface ConnectionsPerk {
  name: string;
  iconUrl: string | null;
}

export interface ConnectionsGroup {
  theme: string;
  color: "yellow" | "green" | "blue" | "purple";
  difficulty: number;
  perks: ConnectionsPerk[];
}

export interface ConnectionsPuzzle {
  date: string;
  groups: ConnectionsGroup[];
}

interface RawGroup {
  theme: string;
  color: "yellow" | "green" | "blue" | "purple";
  difficulty: number;
  perks: string[]; // perk names as strings in the JSON file
}

interface RawPuzzle {
  date: string;
  groups: RawGroup[];
}

export interface ConnectionsGuessRequest {
  date: string;
  perks: string[]; // exactly 4 perk names submitted by the player
}

export interface ConnectionsGuessResponse {
  correct: boolean;
  group?: ConnectionsGroup;
  oneAway: boolean;
}

// ── Perk icon lookup ──────────────────────────────────────────────────────────

const require = createRequire(import.meta.url);
const { perks: allPerks } = require("../data/perks.json") as { perks: RawPerk[] };

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const perkByNormalized = new Map<string, RawPerk>(
  allPerks.map((p) => [normalize(p.name), p])
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_PERKS_DIR = path.resolve(__dirname, "../data/assets/perks");

// Build a case-insensitive map of available local perk icon files
// key: lowercase filename → actual filename on disk
const localPerkFiles = new Map<string, string>(
  (fs.existsSync(ASSETS_PERKS_DIR) ? fs.readdirSync(ASSETS_PERKS_DIR) : [])
    .map((f) => [f.toLowerCase(), f])
);

function resolveIconUrl(perkName: string): string | null {
  const key = normalize(perkName);
  let match = perkByNormalized.get(key);

  // Fallback: strip leading "hex" prefix (e.g. "Hex: No One Escapes Death" → "nooneescapesdeath")
  if (!match && key.startsWith("hex")) {
    match = perkByNormalized.get(key.slice(3));
  }

  if (!match) return null;

  // Prefer local asset if available (avoids wiki.gg hotlink protection)
  const wikiUrl = match.iconUrl;
  if (wikiUrl) {
    const filename = wikiUrl.split("/").pop()?.split("?")[0]; // strip query string
    if (filename) {
      const actual = localPerkFiles.get(filename.toLowerCase());
      if (actual) return `/assets/perks/${actual}`;
    }
  }

  return wikiUrl ?? null;
}
const PUZZLES_DIR = path.resolve(__dirname, "../data/puzzles");

function loadPuzzle(date: string): ConnectionsPuzzle {
  const file = path.join(PUZZLES_DIR, `${date}.json`);
  if (!fs.existsSync(file)) {
    throw new NotFoundError(`No Connections puzzle found for date "${date}"`);
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as RawPuzzle;

  return {
    date: raw.date,
    groups: raw.groups.map((g) => ({
      theme: g.theme,
      color: g.color,
      difficulty: g.difficulty,
      perks: g.perks.map((name) => ({
        name,
        iconUrl: resolveIconUrl(name),
      })),
    })),
  };
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class GameConnectionsUseCase {
  getPuzzle(date: string): ConnectionsPuzzle {
    return loadPuzzle(date);
  }

  guess(request: ConnectionsGuessRequest): ConnectionsGuessResponse {
    const puzzle = loadPuzzle(request.date);
    const submitted = new Set(request.perks.map((p) => p.trim()));

    for (const group of puzzle.groups) {
      const groupNames = new Set(group.perks.map((p) => p.name));
      const matches = [...submitted].filter((p) => groupNames.has(p)).length;

      if (matches === 4) {
        return { correct: true, group, oneAway: false };
      }

      if (matches === 3) {
        return { correct: false, oneAway: true };
      }
    }

    return { correct: false, oneAway: false };
  }
}
