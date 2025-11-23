FROM node:20-alpine AS base

FROM base AS deps
# libc6-compat is not needed in newer Alpine versions
WORKDIR /app

COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables (passed via --build-arg)
# NEXT_PUBLIC_API_BASE must be set at build time for Next.js
# Usage: docker build --build-arg NEXT_PUBLIC_API_BASE=http://api.example.com -t app .
ARG NEXT_PUBLIC_API_BASE=http://localhost:8089
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user in a single layer
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# https://nextjs.org/docs/advanced-features/output-file-tracing
# Copy standalone output and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Runtime environment variables
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Healthcheck to monitor container health
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)})" || exit 1

CMD ["node", "server.js"]

