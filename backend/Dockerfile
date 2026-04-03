FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
# prisma is a production dep — already installed above, just copy schema and generate client
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3001
# Run migrations (non-fatal), then always start the app.
# If migrations fail (e.g. DATABASE_URL missing), log the warning and start anyway
# so Railway can health-check and surface the real error in logs.
CMD ["sh", "-c", "npx prisma migrate deploy && echo 'Migrations OK' || echo 'WARNING: Migrations failed — check DATABASE_URL'; node dist/main"]
