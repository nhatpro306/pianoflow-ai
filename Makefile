# PianoFlow AI — dev commands
# Windows users without make: the underlying commands work directly in any shell.

.PHONY: dev up down test lint web

up:            ## Start postgres/redis/api/worker
	docker compose up --build -d

down:          ## Stop the stack
	docker compose down

web:           ## Run Next.js natively (fast HMR)
	pnpm --filter @pianoflow/web dev

test:          ## Python tests (per project: api/worker share the `app` package name)
	uv run --directory apps/api pytest -q
	uv run --directory apps/worker pytest -q
	uv run --directory packages/music-core pytest -q

lint:          ## Lint everything
	uv run ruff check .
	uv run ruff format --check .
	pnpm -r typecheck
