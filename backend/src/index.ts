import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastify from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import fastifyApiReference from "@scalar/fastify-api-reference";
import { z } from "zod";
import { gameRoutes } from "./routes/game.js";
import path from "path";
import { fileURLToPath } from "url";
import fastifyStatic from "@fastify/static";

const app = fastify({
    logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
    openapi: {
        info: {
            title: "Dbdle API",
            version: "1.0.0",
            description: "API for DBDle, Wordle game."
        },
        servers: [
            {
                description: "Development server",
                url: "http://localhost:8081"
            }
        ],
    },
    transform: jsonSchemaTransform,
})

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5173", "http://localhost:8080", "http://localhost"];

await app.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
})

await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "DBDle API",
        slug: "dbdle-api",
        url: "/swagger.json",
      },
    ],
  },
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));

await app.register(fastifyStatic, {
  root:        path.join(__dirname, "data/assets"),
  prefix:      "/assets/",
  maxAge:      "30d",
  immutable:   true,
  etag:        true,
});

await app.register(gameRoutes, { prefix: "/" });

// ── Image proxy (bypasses wiki.gg hotlink protection) ─────────────────────────
app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/proxy/perk-icon",
  schema: {
    hide: true,
    querystring: z.object({ url: z.string() }),
  },
  handler: async (request, reply) => {
    const { url } = request.query as { url: string };

    // Only allow wiki.gg perk icons
    if (!url.startsWith("https://deadbydaylight.wiki.gg/images/")) {
      return reply.status(403).send("Forbidden");
    }

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DBDle/1.0)",
          "Referer": "https://deadbydaylight.wiki.gg/",
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

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: (request, reply) => {
    reply.send(app.swagger());
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Endpoint de teste",
    tags: ["Hello World"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: (request, reply) => {
    reply.send({ message: "Hello, World!" });
  },
});

app.listen({ port: Number(process.env.PORT) || 8081, host: "0.0.0.0" }, function (err) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
