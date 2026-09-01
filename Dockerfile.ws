FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY apps/ws-backend/package.json apps/ws-backend/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

COPY . .

# Prisma needs DATABASE_URL during client generation.
# The real DATABASE_URL will be provided at runtime.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"

RUN pnpm --filter @repo/db build
RUN pnpm --filter ws-backend build

EXPOSE 8080

CMD ["pnpm", "--filter", "ws-backend", "start"]