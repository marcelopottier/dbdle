# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace root manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy frontend package manifest
COPY frontend/package.json ./frontend/

# Install deps
RUN pnpm install --frozen-lockfile --filter frontend

# Copy frontend source
COPY frontend ./frontend

ARG VITE_API_URL=http://localhost:8081
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter frontend build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
