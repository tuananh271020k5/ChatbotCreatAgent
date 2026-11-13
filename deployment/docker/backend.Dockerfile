# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.23.5

FROM node:${NODE_VERSION}-alpine AS dependencies
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM dependencies AS development
RUN mkdir -p /workspace/backend/dist /workspace/frontend/.next /workspace/node_modules/.vitest-cache \
  && chown node:node /workspace /workspace/backend/dist /workspace/frontend/.next /workspace/node_modules/.vitest-cache
COPY --chown=node:node . .
USER node
CMD ["npm", "run", "dev:backend"]

FROM dependencies AS build
COPY . .
RUN npm run build --workspace @agent-builder/contracts \
  && npm run build --workspace @agent-builder/backend \
  && npm prune --omit=dev

FROM node:${NODE_VERSION}-alpine AS production
ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /workspace/backend/dist ./backend/dist
COPY --from=build --chown=node:node /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=node:node /workspace/database/migrations ./database/migrations

USER node
EXPOSE 3001
CMD ["node", "backend/dist/main.js"]
