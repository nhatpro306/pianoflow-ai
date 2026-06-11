# Local-only image — production web runs on Vercel (DEPLOYMENT.md Stage 2).
FROM node:22-slim

RUN corepack enable pnpm
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["pnpm", "dev"]
