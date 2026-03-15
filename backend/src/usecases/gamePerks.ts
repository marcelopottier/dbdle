import { NotFoundError } from "../errors/index.js";
import { Role } from "../types/character.js";

export interface Perk {
  id: string;
  name: string;
  description: string;
  role: Role;
  iconUrl: string | null;
}

// Fallback perks based on verified local assets
const FALLBACK_PERKS: Perk[] = [
  { id: "adrenaline", name: "Adrenaline", role: "survivor", description: "You are fueled by unexpected energy when on the verge of escape.", iconUrl: "/assets/perks/IconPerks_adrenaline.png" },
  { id: "agitation", name: "Agitation", role: "killer", description: "You get excited in anticipation of hooking your prey.", iconUrl: "/assets/perks/IconPerks_agitation.png" },
  { id: "bloodhound", name: "Bloodhound", role: "killer", description: "Like a hunting dog, you smell a fresh blood trace from a great distance.", iconUrl: "/assets/perks/IconPerks_bloodhound.png" },
  { id: "coulrophobia", name: "Coulrophobia", role: "killer", description: "Your presence alone instils great fear.", iconUrl: "/assets/perks/IconPerks_coulrophobia.png" },
  { id: "enduring", name: "Enduring", role: "killer", description: "You are resilient to pain.", iconUrl: "/assets/perks/IconPerks_enduring.png" },
  { id: "flashbang", name: "Flashbang", role: "survivor", description: "You've learned how to craft a flashbang.", iconUrl: "/assets/perks/IconPerks_flashbang.png" },
  { id: "hyperfocus", name: "Hyperfocus", role: "survivor", description: "You focus on the task at hand with incredible intensity.", iconUrl: "/assets/perks/IconPerks_hyperfocus.png" },
  { id: "kindred", name: "Kindred", role: "survivor", description: "Unlocks potential in one's Aura-reading ability.", iconUrl: "/assets/perks/IconPerks_kindred.png" },
  { id: "lightborn", name: "Lightborn", role: "killer", description: "Unlike other beasts of The Fog, you have adapted to light.", iconUrl: "/assets/perks/IconPerks_lightborn.png" },
  { id: "overcharge", name: "Overcharge", role: "killer", description: "You are fuelled by your hate for progress.", iconUrl: "/assets/perks/IconPerks_overcharge.png" },
  { id: "predator", name: "Predator", role: "killer", description: "Your acute senses allow you to see blood traces more clearly.", iconUrl: "/assets/perks/IconPerks_predator.png" },
  { id: "reassurance", name: "Reassurance", role: "survivor", description: "You provide comfort and hope to those in need.", iconUrl: "/assets/perks/IconPerks_reassurance.png" },
  { id: "resilience", name: "Resilience", role: "survivor", description: "You are motivated by even the most dire situations.", iconUrl: "/assets/perks/IconPerks_resilience.png" },
  { id: "shadowborn", name: "Shadowborn", role: "killer", description: "You have a keen vision in the darkness of The Fog.", iconUrl: "/assets/perks/IconPerks_shadowborn.png" },
  { id: "stridor", name: "Stridor", role: "killer", description: "You are acutely sensitive to the breathing of your prey.", iconUrl: "/assets/perks/IconPerks_stridor.png" },
  { id: "thanatophobia", name: "Thanatophobia", role: "killer", description: "Their courage fades in the face of their inevitable demise.", iconUrl: "/assets/perks/IconPerks_thanatophobia.png" },
  { id: "tinkerer", name: "Tinkerer", role: "killer", description: "When a Generator is repaired to 70%, you receive a Loud Noise notification.", iconUrl: "/assets/perks/IconPerks_tinkerer.png" },
];

const allPerks: Perk[] = FALLBACK_PERKS;
const killerPerks = allPerks.filter(p => p.role === "killer");
const survivorPerks = allPerks.filter(p => p.role === "survivor");

function seedFromDate(date: string, role: Role): number {
  const str = `${date}-${role}-perk-v2`; // v2 to avoid previous bad seeds
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getPerkOfTheDay(date: string, role: Role): Perk {
  const pool = role === "killer" ? killerPerks : survivorPerks;
  const seed = seedFromDate(date, role);
  return pool[seed % pool.length];
}

export interface GuessRequest {
  perkId: string;
  role: Role;
  date: string;
}

export interface GuessResponse {
  correct: boolean;
  perk: {
    name: string;
    iconUrl: string | null;
  };
}

export class GamePerksUseCase {
  getPerksList(role?: Role): Perk[] {
    if (role === "killer") return killerPerks;
    if (role === "survivor") return survivorPerks;
    return allPerks;
  }

  guess(request: GuessRequest): GuessResponse {
    const perk = allPerks.find(p => p.id === request.perkId && p.role === request.role);
    if (!perk) {
      throw new NotFoundError(`Perk "${request.perkId}" not found for role "${request.role}"`);
    }

    const correctPerk = getPerkOfTheDay(request.date, request.role);

    return {
      correct: perk.id === correctPerk.id,
      perk: {
        name: perk.name,
        iconUrl: perk.iconUrl
      }
    };
  }

  reveal(date: string, role: Role): { perk: Perk } {
    return { perk: getPerkOfTheDay(date, role) };
  }

  getTarget(date: string, role: Role): { iconUrl: string | null } {
    const perk = getPerkOfTheDay(date, role);
    return { iconUrl: perk.iconUrl };
  }
}
