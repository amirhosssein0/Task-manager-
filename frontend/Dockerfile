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
# If not provided, will use default (should be set via --build-arg)
ARG NEXT_PUBLIC_API_BASE=http://localhost:8089
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# PORT and HOSTNAME can be set via environment variables at runtime

CMD ["node", "server.js"]

