import { createRequire } from "module";

import { NotFoundError } from "../errors/index.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Perk {
  id: string;
  name: string;
  description: string;
  role: "killer" | "survivor";
  iconUrl: string | null;
}

export interface PerkGuessRequest {
  perkId: string;
  role: "killer" | "survivor";
  date: string; // "YYYY-MM-DD"
}

export interface PerkGuessResponse {
  correct: boolean;
  perk: { name: string; iconUrl: string | null };
}

export interface PerkRevealResponse {
  perk: Perk;
}

// ── Load data ─────────────────────────────────────────────────────────────────

const require = createRequire(import.meta.url);
const { perks: allPerks } = require("../data/perks.json") as { perks: Perk[] };

const killerPerks   = allPerks.filter(p => p.role === "killer");
const survivorPerks = allPerks.filter(p => p.role === "survivor");

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedFromDate(date: string, role: "killer" | "survivor"): number {
  const str = `${date}-${role}-perk`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getPerkOfTheDay(date: string, role: "killer" | "survivor"): Perk {
  const pool = role === "killer" ? killerPerks : survivorPerks;
  const seed = seedFromDate(date, role);
  return pool[seed % pool.length];
}

// ── Use Case ──────────────────────────────────────────────────────────────────

export class GamePerkUseCase {
  guess(request: PerkGuessRequest): PerkGuessResponse {
    const guessed = allPerks.find(
      p => p.id === request.perkId && p.role === request.role,
    );

    if (!guessed) {
      throw new NotFoundError(
        `Perk "${request.perkId}" not found for role "${request.role}"`,
      );
    }

    const correct = getPerkOfTheDay(request.date, request.role);

    return {
      correct: guessed.id === correct.id,
      perk: { name: guessed.name, iconUrl: guessed.iconUrl },
    };
  }

  reveal(date: string, role: "killer" | "survivor"): PerkRevealResponse {
    return { perk: getPerkOfTheDay(date, role) };
  }

  list(role?: "killer" | "survivor"): Perk[] {
    if (role) return allPerks.filter(p => p.role === role);
    return allPerks;
  }
}
