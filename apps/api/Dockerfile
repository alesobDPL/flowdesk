# syntax=docker/dockerfile:1
FROM node:26-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g corepack@latest && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS build
RUN pnpm install --frozen-lockfile --filter @flowdesk/api... --filter flowdesk
COPY . .
RUN pnpm --filter @flowdesk/api build

FROM base AS production-deps
RUN pnpm install --frozen-lockfile --prod --filter @flowdesk/api...

FROM node:26-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=4000
WORKDIR /app
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=production-deps --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=production-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=production-deps --chown=node:node /app/packages/shared ./packages/shared
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/drizzle ./apps/api/drizzle
WORKDIR /app/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
