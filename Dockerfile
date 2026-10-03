FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=true
RUN corepack enable

WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --filter "web..." --filter "wartownik"

ARG DATABASE_URI
ARG NASA_FIRMS_MAP_KEY
ARG NEXT_PUBLIC_SITE_URL
RUN pnpm build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]
