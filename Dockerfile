# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

# Copy prisma schema + config before install (postinstall runs prisma generate)
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build (includes server.js + traced node_modules with pg, prisma client, etc.)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy migration SQL (for docker-migrate.mjs)
COPY --from=builder /app/prisma/migrations ./prisma/migrations

# Copy startup, migration, and seed scripts
COPY docker-entrypoint.sh ./
COPY docker-migrate.mjs ./
COPY docker-seed.mjs ./
# Fix CRLF line endings (if built from Windows checkout) and make executable
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
