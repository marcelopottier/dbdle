import { createRequire } from "module";

import { NotFoundError } from "../errors/index.js";
import { Character, KillerCharacter, SurvivorCharacter } from "../types/character.js";

// ── Load data ─────────────────────────────────────────────────────────────────

const require = createRequire(import.meta.url);
const { characters: allCharacters } = require("../data/characters.json") as {
  characters: Character[];
};

const killers   = allCharacters.filter((c): c is KillerCharacter  => c.role === "killer");
const survivors = allCharacters.filter((c): c is SurvivorCharacter => c.role === "survivor");

// ── Types ─────────────────────────────────────────────────────────────────────

type AttributeStatus = "correct" | "higher" | "lower" | "partial" | "wrong";

interface GuessResult {
  attribute: string;
  guessedValue: string | number | null;
  correctValue: string | number | null;
  status: AttributeStatus;
}

export interface GuessRequest {
  characterId: string;
  role: "killer" | "survivor";
  date: string; // "YYYY-MM-DD"
}

export interface GuessResponse {
  correct: boolean;
  results: GuessResult[];
}

export interface RevealResponse {
  character: Character;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedFromDate(date: string, role: "killer" | "survivor"): number {
  const str = `${date}-${role}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getCharacterOfTheDay(date: string, role: "killer" | "survivor"): Character {
  const pool = role === "killer" ? killers : survivors;
  const seed = seedFromDate(date, role);
  return pool[seed % pool.length];
}

function compareText(guessed: string | null, correct: string | null): AttributeStatus {
  if (guessed === null || correct === null) return "wrong";
  return guessed === correct ? "correct" : "wrong";
}

function compareNumber(guessed: number | null, correct: number | null): AttributeStatus {
  if (guessed === null || correct === null) return "wrong";
  if (guessed === correct) return "correct";
  return guessed > correct ? "lower" : "higher";
}

function buildKillerResults(guessed: KillerCharacter, correct: KillerCharacter): GuessResult[] {
  return [
    {
      attribute: "gender",
      guessedValue: guessed.gender,
      correctValue: correct.gender,
      status: compareText(guessed.gender, correct.gender),
    },
    {
      attribute: "origin",
      guessedValue: guessed.origin,
      correctValue: correct.origin,
      status: compareText(guessed.origin, correct.origin),
    },
    {
      attribute: "chapter",
      guessedValue: guessed.chapter,
      correctValue: correct.chapter,
      status: compareNumber(guessed.chapter, correct.chapter),
    },
    {
      attribute: "releaseYear",
      guessedValue: guessed.releaseYear,
      correctValue: correct.releaseYear,
      status: compareNumber(guessed.releaseYear, correct.releaseYear),
    },
    {
      attribute: "moveSpeed",
      guessedValue: guessed.moveSpeed,
      correctValue: correct.moveSpeed,
      status: compareNumber(guessed.moveSpeed, correct.moveSpeed),
    },
    {
      attribute: "terrorRadius",
      guessedValue: guessed.terrorRadius,
      correctValue: correct.terrorRadius,
      status: compareNumber(guessed.terrorRadius, correct.terrorRadius),
    },
    {
      attribute: "powerCategory",
      guessedValue: guessed.powerCategory,
      correctValue: correct.powerCategory,
      status: compareText(guessed.powerCategory, correct.powerCategory),
    },
  ];
}

function buildSurvivorResults(guessed: SurvivorCharacter, correct: SurvivorCharacter): GuessResult[] {
  return [
    {
      attribute: "gender",
      guessedValue: guessed.gender,
      correctValue: correct.gender,
      status: compareText(guessed.gender, correct.gender),
    },
    {
      attribute: "origin",
      guessedValue: guessed.origin,
      correctValue: correct.origin,
      status: compareText(guessed.origin, correct.origin),
    },
    {
      attribute: "chapter",
      guessedValue: guessed.chapter,
      correctValue: correct.chapter,
      status: compareNumber(guessed.chapter, correct.chapter),
    },
    {
      attribute: "releaseYear",
      guessedValue: guessed.releaseYear,
      correctValue: correct.releaseYear,
      status: compareNumber(guessed.releaseYear, correct.releaseYear),
    },
    {
      attribute: "difficulty",
      guessedValue: guessed.difficulty,
      correctValue: correct.difficulty,
      status: compareText(guessed.difficulty, correct.difficulty),
    },
  ];
}

// ── Use Case ──────────────────────────────────────────────────────────────────

export class GameClassicUseCase {
  guess(request: GuessRequest): GuessResponse {
    const guessed = allCharacters.find(
      (c) => c.id === request.characterId && c.role === request.role,
    );

    if (!guessed) {
      throw new NotFoundError(
        `Character "${request.characterId}" not found for role "${request.role}"`,
      );
    }

    const correct = getCharacterOfTheDay(request.date, request.role);

    if (guessed.role === "killer" && correct.role === "killer") {
      return { correct: guessed.id === correct.id, results: buildKillerResults(guessed, correct) };
    }

    if (guessed.role === "survivor" && correct.role === "survivor") {
      return { correct: guessed.id === correct.id, results: buildSurvivorResults(guessed, correct) };
    }

    throw new NotFoundError("Role mismatch");
  }

  reveal(date: string, role: "killer" | "survivor"): RevealResponse {
    return { character: getCharacterOfTheDay(date, role) };
  }
}
