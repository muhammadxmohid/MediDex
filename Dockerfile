# syntax=docker/dockerfile:1

# Build a container that runs ONLY the backend in server/
FROM node:20-alpine

WORKDIR /app

# Install backend deps (include devDeps so prisma CLI is available at build)
COPY server/package*.json ./
RUN npm ci

# Prisma client
COPY server/prisma ./prisma
RUN npx prisma generate

# App source
COPY server/src ./src

# Runtime env
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Run DB migrations at runtime (DATABASE_URL available on Railway), then start API
CMD sh -c "npx prisma migrate deploy && node src/index.js"