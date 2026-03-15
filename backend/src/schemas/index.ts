import z from "zod";

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});

export const RoleSchema = z.enum(["killer", "survivor"]);

export const AttributeStatusSchema = z.enum(["correct", "higher", "lower", "partial", "wrong"]);

export const GuessResultSchema = z.object({
  attribute: z.string(),
  guessedValue: z.union([z.string(), z.number()]).nullable(),
  correctValue: z.union([z.string(), z.number()]).nullable(),
  status: AttributeStatusSchema,
});

export const GuessRequestSchema = z.object({
  characterId: z.string().min(1),
  role: RoleSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const GuessResponseSchema = z.object({
  correct: z.boolean(),
  results: z.array(GuessResultSchema),
});

const CharacterPerkSchema = z.object({
  name: z.string().optional(),
  description: z.string(),
  iconUrl: z.string().nullable(),
});

// ── Perk game schemas ──────────────────────────────────────────────────────────

export const PerkSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  role: RoleSchema,
  iconUrl: z.string().nullable(),
});

export const PerkGuessRequestSchema = z.object({
  perkId: z.string().min(1),
  role: RoleSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const PerkGuessResponseSchema = z.object({
  correct: z.boolean(),
  perk: z.object({
    name: z.string(),
    iconUrl: z.string().nullable(),
  }),
});

export const PerkRevealResponseSchema = z.object({
  perk: PerkSchema,
});

export const PerkListSchema = z.object({
  perks: z.array(PerkSchema),
});

export const PerkTargetResponseSchema = z.object({
  iconUrl: z.string().nullable(),
});

const CharacterBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: RoleSchema,
  gender: z.enum(["male", "female", "nonbinary"]),
  origin: z.enum(["original", "licensed"]),
  portraitUrl: z.string().nullable(),
  perks: z.array(CharacterPerkSchema),
  chapter: z.number().nullable(),
  releaseYear: z.number().nullable(),
});

export const RevealResponseSchema = z.object({
  character: z.discriminatedUnion("role", [
    CharacterBaseSchema.extend({
      role: z.literal("killer"),
      moveSpeed: z.number().nullable(),
      terrorRadius: z.number().nullable(),
      powerCategory: z.string().nullable(),
      terrorRadiusAudioUrl: z.string().nullable(),
    }),
    CharacterBaseSchema.extend({
      role: z.literal("survivor"),
      difficulty: z.enum(["easy", "intermediate", "hard"]).nullable(),
    }),
  ]),
});

// ── Zoom game schemas ──────────────────────────────────────────────────────────

export const ZoomRequestSchema = z.object({
  characterId: z.string().min(1),
  role: RoleSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  attempt: z.coerce.number().int().min(1).max(5),
});

export const ZoomTargetResponseSchema = z.object({
  portraitUrl: z.string().nullable(),
  zoom: z.number(),
  x: z.number(),
  y: z.number(),
  nextZoomLevel: z.number(),
});

export const ZoomGuessResponseSchema = z.object({
  correct: z.boolean(),
  nextZoomLevel: z.number().nullable(),
  x: z.number(),
  y: z.number(),
  character: z.object({
    name: z.string(),
    portraitUrl: z.string().nullable(),
  }),
});

export const ZoomRevealResponseSchema = z.object({
  character: z.object({
    id: z.string(),
    name: z.string(),
    role: RoleSchema,
    portraitUrl: z.string().nullable(),
  }),
});


// ── Connections game schemas ───────────────────────────────────────────────────

export const ConnectionsPerkSchema = z.object({
  name: z.string(),
  iconUrl: z.string().nullable(),
});

export const ConnectionsGroupSchema = z.object({
  theme: z.string(),
  color: z.enum(["yellow", "green", "blue", "purple"]),
  difficulty: z.number().int().min(1).max(4),
  perks: z.array(z.string()).length(4),
});

export const ConnectionsGroupEnrichedSchema = ConnectionsGroupSchema.extend({
  perks: z.array(ConnectionsPerkSchema).length(4),
});

export const ConnectionsPuzzleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groups: z.array(ConnectionsGroupEnrichedSchema).length(4),
});

export const ConnectionsGuessRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  perks: z.array(z.string()).length(4),
});

export const ConnectionsGuessResponseSchema = z.object({
  correct: z.boolean(),
  /** Present when correct=true */
  group: ConnectionsGroupEnrichedSchema.optional(),
  /** Present when correct=false — if exactly 3 of 4 perks belong to a single group */
  oneAway: z.boolean(),
});

export const CharacterListSchema = z.object({
  characters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: RoleSchema,
      portraitUrl: z.string().nullable(),
    }),
  ),
});
