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
# Copy lockfile and package manifest for prod install
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
# Re-generate Prisma client in production image (resolves correct openssl/path)
COPY prisma ./prisma
RUN pnpm add -D prisma && npx prisma generate
# Copy compiled output
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
