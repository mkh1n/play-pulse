# Makefile

.PHONY: run

run:
	npx concurrently \
		"cd apps/frontend && npm run dev" \
		"cd apps/backend && npm run start:dev"