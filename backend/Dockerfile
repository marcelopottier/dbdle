# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace root manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package manifest
COPY backend/package.json ./backend/

# Install all deps
RUN pnpm install --frozen-lockfile --filter @dbdle/backend

# Copy backend source
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src

# Compile TypeScript
RUN pnpm --filter @dbdle/backend build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

RUN pnpm install --frozen-lockfile --filter @dbdle/backend --prod

# Copy compiled output
COPY --from=builder /app/backend/dist ./backend/dist

# Copy data files (characters, perks, puzzles, assets)
COPY backend/src/data ./backend/dist/data

EXPOSE 8081

ENV NODE_ENV=production

WORKDIR /app/backend

CMD ["node", "dist/index.js"]
