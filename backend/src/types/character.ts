export type Role = "killer" | "survivor";
export type Gender = "male" | "female" | "nonbinary";
export type Origin = "original" | "licensed";
export type PowerCategory =
  | "absorb" | "blink" | "control" | "frenzy" | "infection"
  | "madness" | "portal" | "ranged" | "rush" | "stealth"
  | "summon" | "teleport" | "trapper";
export type Difficulty = "easy" | "intermediate" | "hard";

interface Perk {
  name?: string;
  description: string;
  iconUrl: string | null;
}

interface CharacterBase {
  id: string;
  name: string;
  role: Role;
  gender: Gender;
  origin: Origin;
  portraitUrl: string | null;
  perks: Perk[];
  chapter: number | null;
  releaseYear: number | null;
}

export interface KillerCharacter extends CharacterBase {
  role: "killer";
  moveSpeed: number | null;
  terrorRadius: number | null;
  powerCategory: PowerCategory | null;
  terrorRadiusAudioUrl: string | null;
  audioLevels?: {
    "32m"?: string;
    "16m"?: string;
    "8m"?: string;
    "chase"?: string;
  } | null;
}

export interface SurvivorCharacter extends CharacterBase {
  role: "survivor";
  difficulty: Difficulty | null;
}

export type Character = KillerCharacter | SurvivorCharacter;
