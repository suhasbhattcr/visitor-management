# ── Stage 1: Build TypeScript ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json nest-cli.json ./
RUN npm install
COPY src ./src
RUN npm run build

# ── Stage 2: Production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4001

CMD ["node", "dist/main"]
