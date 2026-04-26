FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY backend/ .
RUN npx prisma generate
RUN pnpm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
COPY backend/entrypoint.js ./entrypoint.js
EXPOSE 3001
CMD ["node", "entrypoint.js"]
