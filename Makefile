.PHONY: run run-docker stop-docker restart-docker logs logs-service \
redis-start redis-stop install build clean test test-e2e lint \
format env-setup health-check help

run:
	@echo "🔍 Проверка Redis..."

	@which redis-server > /dev/null 2>&1 || ( \
		echo "📦 Redis не найден. Устанавливаем..." && \
		sudo apt update && \
		sudo apt install -y redis-server \
	)

	@redis-cli ping > /dev/null 2>&1 || ( \
		echo "🔴 Запуск Redis..." && \
		redis-server --daemonize yes \
	)

	@echo "🚀 Запуск frontend + backend..."

	# Запускаем frontend и backend
	npx concurrently \
		--names "FRONTEND,BACKEND" \
		"cd apps/frontend && npm run dev" \
		"cd apps/backend && npm run start:dev"

# Отдельная команда для запуска туннеля (ручной запуск после поднятия серверов)
tunnel:
	@echo "🌐 Запуск localtunnel для порта 3000..."
	@echo "⚠️ Убедись, что backend и frontend уже запущены (make run)"
	npx localtunnel --port 3000 --subdomain play-pulse

run-docker:
	docker-compose up -d
	@echo "✅ Проект запущен!"
	@echo "📌 Frontend: http://localhost:3000"
	@echo "📌 Backend:  http://localhost:3001"
	@echo "📌 Swagger:  http://localhost:3001/api"
	@echo "📌 Redis:    localhost:6379"
	@echo ""
	@echo "Для остановки выполните: make stop-docker"

stop-docker:
	docker-compose down

restart-docker:
	docker-compose restart

logs:
	docker-compose logs -f

logs-service:
	@if [ -z "$(service)" ]; then \
		echo "Usage: make logs-service service=<backend|frontend|redis>"; \
	else \
		docker-compose logs -f $(service); \
	fi

redis-start:
	@echo "🔴 Запуск Redis..."
	@which redis-server > /dev/null 2>&1 || (echo "❌ Redis не установлен" && exit 1)
	redis-server --daemonize yes
	@echo "✅ Redis запущен"

redis-stop:
	@echo "🛑 Остановка Redis..."
	redis-cli shutdown || true
	@echo "✅ Redis остановлен"

install:
	npm install
	cd apps/backend && npm install
	cd apps/frontend && npm install
	@echo "✅ Все зависимости установлены"

build:
	cd apps/backend && npm run build
	cd apps/frontend && npm run build
	@echo "✅ Проект собран"

clean:
	rm -rf apps/backend/dist
	rm -rf apps/backend/node_modules
	rm -rf apps/frontend/.next
	rm -rf apps/frontend/node_modules
	rm -rf node_modules
	@echo "✅ Очистка завершена"

test:
	cd apps/backend && npm run test
	cd apps/frontend && npm run test || echo "Frontend tests not configured"

test-e2e:
	cd apps/backend && npm run test:e2e

lint:
	cd apps/backend && npm run lint
	cd apps/frontend && npm run lint || echo "Frontend lint not configured"

format:
	cd apps/backend && npm run format
	cd apps/frontend && npm run format || echo "Frontend format not configured"

env-setup:
	@if [ ! -f apps/backend/.env ]; then \
		cp apps/backend/.env.example apps/backend/.env; \
		echo "✅ .env создан"; \
	else \
		echo "ℹ️ .env уже существует"; \
	fi

health-check:
	@echo "🔍 Проверка сервисов..."
	@curl -s http://localhost:3001/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend DOWN"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend DOWN"
	@redis-cli ping > /dev/null 2>&1 && echo "✅ Redis OK" || echo "❌ Redis DOWN"

help:
	@echo "Доступные команды:"
	@echo "make run"
	@echo "make run-docker"
	@echo "make stop-docker"
	@echo "make logs"