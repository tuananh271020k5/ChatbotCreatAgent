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
CMD ["npm", "run", "dev:frontend"]

FROM dependencies AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY . .
RUN npm run build --workspace @agent-builder/contracts \
  && npm run build --workspace @agent-builder/frontend \
  && npm prune --omit=dev

FROM node:22-alpine AS production
ENV NODE_ENV=production
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
