# ---------- Base Stage ----------
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.1 --activate

# ---------- Dependencies Stage ----------
FROM base AS deps

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/

RUN pnpm install --frozen-lockfile --filter ./apps/frontend...

# ---------- Build Stage ----------
FROM deps AS builder

WORKDIR /app/apps/frontend
COPY apps/frontend/ .

# Only pass public config at build time
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST

ENV NODE_ENV=production
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# IMPORTANT: Do not require DB/auth secrets at build time.
RUN pnpm run build

# ---------- Run Stage ----------
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.7.1 --activate

WORKDIR /app/apps/frontend
ENV NODE_ENV=production
ENV PORT=8080

# Copy built assets
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/package.json ./
COPY --from=builder /app/apps/frontend/public ./public

# Copy node_modules from deps stage (built with the same workspace filter)
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/frontend/node_modules ./node_modules

EXPOSE 8080
CMD ["pnpm", "start"]
