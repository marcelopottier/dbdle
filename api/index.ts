import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { gameRoutes } from "../backend/dist/routes/game.js";

const app = fastify({ logger: false });

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : true;

await app.register(fastifyCors, { origin: allowedOrigins, credentials: true });

await app.register(gameRoutes, { prefix: "/" });

// Image proxy (fallback for icons not bundled locally)
app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/proxy/perk-icon",
  schema: {
    hide: true,
    querystring: z.object({ url: z.string() }),
  },
  handler: async (request, reply) => {
    const { url } = request.query as { url: string };
    if (!url.startsWith("https://deadbydaylight.wiki.gg/images/")) {
      return reply.status(403).send("Forbidden");
    }
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DBDle/1.0)",
          Referer: "https://deadbydaylight.wiki.gg/",
        },
      });
      if (!res.ok) return reply.status(res.status).send("Upstream error");
      const contentType = res.headers.get("content-type") ?? "image/png";
      const buffer = Buffer.from(await res.arrayBuffer());
      reply
        .header("Content-Type", contentType)
        .header("Cache-Control", "public, max-age=604800, immutable")
        .send(buffer);
    } catch {
      reply.status(502).send("Bad gateway");
    }
  },
});

await app.ready();

export default async function handler(req: any, res: any) {
  app.server.emit("request", req, res);
}
