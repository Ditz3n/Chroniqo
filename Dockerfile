# Dockerfile
FROM node:20-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
# libc6-compat might be needed by some Node.js packages (like Prisma engines) on Alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
# Using npm ci for clean, deterministic installs
# --ignore-scripts prevents postinstall from running prisma generate here,
# since prisma/schema.prisma isn't available in this stage yet
RUN npm ci --ignore-scripts

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma 7 requires DATABASE_URL at generate time due to prisma.config.ts resolving env vars eagerly.
# This placeholder is only used during the build stage and never leaks into the final runtime image.
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}

# Generate Prisma Client for the build
RUN npx prisma generate

# Build Next.js (utilizes output: "standalone" from next.config.ts)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install openssl for Prisma in the runtime environment
RUN apk add --no-cache openssl

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# This copies the minimal required node_modules and server files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
# Ensure Next.js binds to all network interfaces inside the container
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]