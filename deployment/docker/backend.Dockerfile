# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS dependencies
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci

FROM dependencies AS development
COPY . .
CMD ["npm", "run", "dev:backend"]

FROM dependencies AS build
COPY . .
RUN npm run build --workspace @agent-builder/contracts \
  && npm run build --workspace @agent-builder/backend \
  && npm prune --omit=dev

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /workspace/backend/dist ./backend/dist
COPY --from=build --chown=node:node /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist

USER node
EXPOSE 3001
CMD ["node", "backend/dist/main.js"]
