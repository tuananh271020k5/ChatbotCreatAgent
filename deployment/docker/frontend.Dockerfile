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
CMD ["npm", "run", "dev:frontend"]

FROM dependencies AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build --workspace @agent-builder/contracts \
  && npm run build --workspace @agent-builder/frontend \
  && npm prune --omit=dev

FROM node:${NODE_VERSION}-alpine AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /workspace

COPY --from=build --chown=node:node /workspace/package.json ./package.json
COPY --from=build --chown=node:node /workspace/package-lock.json ./package-lock.json
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /workspace/frontend/package.json ./frontend/package.json
COPY --from=build --chown=node:node /workspace/frontend/.next ./frontend/.next
COPY --from=build --chown=node:node /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist

USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@agent-builder/frontend"]
