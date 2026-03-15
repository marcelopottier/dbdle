import { createRequire } from "module";
import { Character } from "../types/character.js";
import { NotFoundError } from "../errors/index.js";

const require = createRequire(import.meta.url);
const { characters: allCharacters } = require("../data/characters.json") as {
  characters: Character[];
};

const killers = allCharacters.filter((c) => c.role === "killer");
const survivors = allCharacters.filter((c) => c.role === "survivor");

function seedFromDate(date: string, role: string): number {
  const str = `${date}-${role}-zoom-v3`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getCharacterOfTheDay(date: string, role: string): Character {
  const pool = role === "killer" ? killers : survivors;
  const seed = seedFromDate(date, role);
  return pool[seed % pool.length];
}

/**
 * Calculates deterministic coordinates that move from a "distraction" point
 * toward the character's face/center based on the current attempt.
 */
function getInterpolatedCoords(seed: number, attempt: number) {
  // 1. Determine "Face/Center" target (the reveal)
  // X: 40% to 60% (centered)
  // Y: 15% to 35% (face area)
  const faceX = (seed % 21) + 40; 
  const faceY = ((seed >> 4) % 21) + 15;

  // 2. Determine "Distraction" starting point (less obvious features)
  // Biased towards the edges but still on the portrait area (20-80%)
  const distractX = (seed % 61) + 20;
  const distractY = ((seed >> 8) % 51) + 40; // Lower half often has clothes/hair/background

  // 3. Define interpolation progress per attempt (1 to 4)
  const interpolationMap: Record<number, number> = {
    1: 0,    // 100% distraction
    2: 0.25, // Getting closer
    3: 0.60, // Almost there
    4: 1.0   // Centered on face/shoulders
  };

  const progress = interpolationMap[attempt] ?? 1.0;

  // Interpolate
  const x = Math.round(distractX + (faceX - distractX) * progress);
  const y = Math.round(distractY + (faceY - distractY) * progress);

  return { x, y };
}

const ZOOM_LEVELS: Record<number, number> = {
  1: 700,
  2: 600,
  3: 500,
  4: 300
};

export class GameZoomUseCase {
  getTarget(date: string, role: string, attempt: number) {
    const character = getCharacterOfTheDay(date, role);
    const seed = seedFromDate(date, role);
    const { x, y } = getInterpolatedCoords(seed, attempt);
    const zoom = ZOOM_LEVELS[attempt] || 100;

    return {
      portraitUrl: character.portraitUrl,
      zoom,
      x,
      y,
      nextZoomLevel: ZOOM_LEVELS[attempt + 1] || 100
    };
  }

  guess(request: { characterId: string; role: string; date: string; attempt: number }) {
    const target = getCharacterOfTheDay(request.date, request.role);
    const guessed = allCharacters.find(c => c.id === request.characterId && c.role === request.role);

    if (!guessed) {
      throw new NotFoundError("Character not found");
    }

    const nextAttempt = request.attempt + 1;
    const { x, y } = getInterpolatedCoords(seedFromDate(request.date, request.role), nextAttempt);
    const nextZoomLevel = ZOOM_LEVELS[nextAttempt] || 100;

    return {
      correct: guessed.id === target.id,
      character: {
        name: guessed.name,
        portraitUrl: guessed.portraitUrl
      },
      nextZoomLevel,
      x,
      y
    };
  }

  reveal(date: string, role: string) {
    return {
      character: getCharacterOfTheDay(date, role)
    };
  }
}
