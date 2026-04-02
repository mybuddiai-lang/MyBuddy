.PHONY: help install dev build test clean db-up db-down db-reset push

# Colors
CYAN  = \033[0;36m
RESET = \033[0m

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

# ─── Install ────────────────────────────────────────────────
install: ## Install all dependencies (frontend + backend)
	@echo "Installing frontend deps..."
	cd frontend && npm install
	@echo "Installing backend deps..."
	cd backend && npm install
	@echo "Done."

# ─── Dev ────────────────────────────────────────────────────
dev: ## Start all services via Docker Compose + Next.js dev server
	docker compose up -d postgres redis
	@echo "Waiting for Postgres..."
	@sleep 2
	cd backend && npm run prisma:migrate && npm run start:dev &
	cd frontend && npm run dev

dev-backend: ## Start backend only (needs Docker services running)
	docker compose up -d postgres redis
	cd backend && npm run start:dev

dev-frontend: ## Start frontend only
	cd frontend && npm run dev

# ─── Build ──────────────────────────────────────────────────
build: ## Build both frontend and backend for production
	cd frontend && npm run build
	cd backend && npm run build

build-docker: ## Build all Docker images
	docker compose build

# ─── Database ───────────────────────────────────────────────
db-up: ## Start database and Redis containers
	docker compose up -d postgres redis

db-down: ## Stop database and Redis containers
	docker compose stop postgres redis

db-reset: ## Reset database (drop + re-migrate + seed)
	cd backend && npx prisma migrate reset --force

db-studio: ## Open Prisma Studio
	cd backend && npm run prisma:studio

db-migrate: ## Run pending migrations
	cd backend && npm run prisma:migrate

db-generate: ## Regenerate Prisma client
	cd backend && npm run prisma:generate

# ─── Docker ─────────────────────────────────────────────────
up: ## Start all services (full stack via Docker)
	docker compose up -d

down: ## Stop all Docker services
	docker compose down

logs: ## Tail all Docker service logs
	docker compose logs -f

logs-backend: ## Tail backend logs
	docker compose logs -f backend

logs-frontend: ## Tail frontend logs
	docker compose logs -f frontend

# ─── Test ───────────────────────────────────────────────────
test: ## Run backend tests
	cd backend && npm test

test-cov: ## Run backend tests with coverage
	cd backend && npm run test:cov

# ─── Lint / Format ──────────────────────────────────────────
lint: ## Lint frontend and backend
	cd frontend && npm run lint
	cd backend && npm run lint

format: ## Format all TypeScript files
	cd backend && npm run format

# ─── Clean ──────────────────────────────────────────────────
clean: ## Remove build artifacts and node_modules
	rm -rf frontend/.next frontend/node_modules
	rm -rf backend/dist backend/node_modules
	@echo "Cleaned."

# ─── Git ────────────────────────────────────────────────────
push: ## Commit all changes and push to origin
	git add -A
	git commit -m "chore: continuous build updates"
	git push origin main
