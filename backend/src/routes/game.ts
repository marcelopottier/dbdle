import { createRequire } from "module";
import { z } from "zod";

import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { NotFoundError } from "../errors/index.js";
import {
  CharacterListSchema,
  ConnectionsGuessRequestSchema,
  ConnectionsGuessResponseSchema,
  ConnectionsPuzzleSchema,
  ErrorSchema,
  GuessRequestSchema,
  GuessResponseSchema,
  PerkGuessRequestSchema,
  PerkGuessResponseSchema,
  PerkListSchema,
  PerkRevealResponseSchema,
  PerkTargetResponseSchema,
  RevealResponseSchema,
  ZoomGuessResponseSchema,
  ZoomRequestSchema,
  ZoomRevealResponseSchema,
  ZoomTargetResponseSchema,
} from "../schemas/index.js";
import { Character } from "../types/character.js";
import { GameClassicUseCase } from "../usecases/gameClassic.js";
import { GamePerksUseCase } from "../usecases/gamePerks.js";
import { GameZoomUseCase } from "../usecases/gameZoom.js";
import { GameConnectionsUseCase } from "../usecases/gameConnections.js";

const require = createRequire(import.meta.url);
const { characters } = require("../data/characters.json") as { characters: Character[] };

const gameClassic = new GameClassicUseCase();
const gamePerks = new GamePerksUseCase();
const gameZoom = new GameZoomUseCase();
const gameConnections = new GameConnectionsUseCase();

export const gameRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/game/classic/guess",
    schema: {
      description: "Submit a guess for the Classic game mode",
      tags: ["Game Classic"],
      body: GuessRequestSchema,
      response: {
        200: GuessResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const result = gameClassic.guess(request.body);
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message, code: "Not Found" });
        }
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/classic/reveal",
    schema: {
      description: "Reveal the character of the day (called on defeat)",
      tags: ["Game Classic"],
      querystring: GuessRequestSchema.pick({ date: true, role: true }),
      response: {
        200: RevealResponseSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { date, role } = request.query;
        const result = gameClassic.reveal(date, role);
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/classic/characters",
    schema: {
      description: "List all characters for autocomplete (id + name + role only). Filter by role optionally.",
      tags: ["Game Classic"],
      querystring: GuessRequestSchema.pick({ role: true }).partial(),
      response: {
        200: CharacterListSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { role } = request.query;
        const filtered = role ? characters.filter((c) => c.role === role) : characters;
        return reply.status(200).send({
          characters: filtered.map((c) => ({
            id: c.id,
            name: c.role === "killer" ? c.name.replace(/^The\s+/i, "") : c.name,
            role: c.role,
            portraitUrl: c.portraitUrl,
          })),
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  // ── Perk Mode Routes ───────────────────────────────────────────────────────────

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/game/perk/guess",
    schema: {
      description: "Submit a guess for the Perk game mode",
      tags: ["Game Perk"],
      body: PerkGuessRequestSchema,
      response: {
        200: PerkGuessResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const result = gamePerks.guess(request.body);
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message, code: "Not Found" });
        }
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/perk/reveal",
    schema: {
      description: "Reveal the perk of the day",
      tags: ["Game Perk"],
      querystring: PerkGuessRequestSchema.pick({ date: true, role: true }),
      response: {
        200: PerkRevealResponseSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { date, role } = request.query;
        const result = gamePerks.reveal(date, role);
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/perk/perks",
    schema: {
      description: "List all perks for autocomplete",
      tags: ["Game Perk"],
      querystring: PerkGuessRequestSchema.pick({ role: true }).partial(),
      response: {
        200: PerkListSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { role } = request.query;
        const result = gamePerks.getPerksList(role);
        return reply.status(200).send({ perks: result });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/perk/target",
    schema: {
      description: "Get the target perk's icon for the current day",
      tags: ["Game Perk"],
      querystring: PerkGuessRequestSchema.pick({ date: true, role: true }),
      response: {
        200: PerkTargetResponseSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { date, role } = request.query;
        const result = gamePerks.getTarget(date, role);
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  // ── Zoom Mode Routes ────────────────────────────────────────────────────────

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/zoom/target",
    schema: {
      description: "Get the portrait and current zoom level for the character of the day",
      tags: ["Game Zoom"],
      querystring: ZoomRequestSchema.pick({ date: true, role: true, attempt: true }),
      response: {
        200: ZoomTargetResponseSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { date, role, attempt } = request.query;
        return reply.status(200).send(gameZoom.getTarget(date, role, attempt));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/game/zoom/guess",
    schema: {
      description: "Submit a guess for the Zoom game mode",
      tags: ["Game Zoom"],
      body: ZoomRequestSchema,
      response: {
        200: ZoomGuessResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const result = gameZoom.guess(request.body);
        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message, code: "Not Found" });
        }
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/zoom/reveal",
    schema: {
      description: "Reveal the character of the day for Zoom mode (called on defeat)",
      tags: ["Game Zoom"],
      querystring: ZoomRequestSchema.pick({ date: true, role: true }),
      response: {
        200: ZoomRevealResponseSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { date, role } = request.query;
        return reply.status(200).send(gameZoom.reveal(date, role));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  // ── Connections Mode Routes ──────────────────────────────────────────────────

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/game/connections/puzzle",
    schema: {
      description: "Get the Connections puzzle for a given date",
      tags: ["Game Connections"],
      querystring: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      }),
      response: {
        200: ConnectionsPuzzleSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const { date } = request.query;
        return reply.status(200).send(gameConnections.getPuzzle(date));
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message, code: "Not Found" });
        }
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/game/connections/guess",
    schema: {
      description: "Submit a group guess for the Connections game mode",
      tags: ["Game Connections"],
      body: ConnectionsGuessRequestSchema,
      response: {
        200: ConnectionsGuessResponseSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        return reply.status(200).send(gameConnections.guess(request.body));
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message, code: "Not Found" });
        }
        return reply.status(500).send({ error: "Internal Server Error", code: "Internal Server Error" });
      }
    },
  });
};
