.PHONY: run run-docker run-dev install build clean help redis-start redis-stop

# Запуск проекта локально (без Docker)
run:
npx concurrently \
"cd apps/frontend && npm run dev" \
"cd apps/backend && npm run start:dev"

# Запуск проекта с Docker (Redis + Backend + Frontend)
run-docker:
docker-compose up -d
@echo "✅ Проект запущен!"
@echo "📌 Frontend: http://localhost:3000"
@echo "📌 Backend:  http://localhost:3001"
@echo "📌 Swagger:  http://localhost:3001/api"
@echo "📌 Redis:    localhost:6379"
@echo ""
@echo "Для остановки выполните: make stop-docker"

# Остановка Docker контейнеров
stop-docker:
docker-compose down

# Перезапуск Docker контейнеров
restart-docker:
docker-compose restart

# Просмотр логов Docker
logs:
docker-compose logs -f

# Просмотр логов конкретного сервиса
logs-service:
@if [ -z "$(service)" ]; then \
echo "Usage: make logs-service service=<backend|frontend|redis>"; \
else \
docker-compose logs -f $(service); \
fi

# Запуск только Redis локально (для разработки без Docker)
redis-start:
@echo "🔴 Запуск Redis..."
@which redis-server > /dev/null 2>&1 || (echo "❌ Redis не установлен. Установите Redis или используйте 'make run-docker'" && exit 1)
redis-server --daemonize yes
@echo "✅ Redis запущен на localhost:6379"

# Остановка Redis локально
redis-stop:
@echo "🛑 Остановка Redis..."
redis-cli shutdown || true
@echo "✅ Redis остановлен"

# Установка всех зависимостей
install:
npm install
cd apps/backend && npm install
cd apps/frontend && npm install
@echo "✅ Все зависимости установлены"

# Сборка проекта
build:
cd apps/backend && npm run build
cd apps/frontend && npm run build
@echo "✅ Проект собран"

# Очистка кэша и build артефактов
clean:
rm -rf apps/backend/dist
rm -rf apps/backend/node_modules
rm -rf apps/frontend/.next
rm -rf apps/frontend/node_modules
rm -rf node_modules
@echo "✅ Очистка завершена"

# Запуск тестов
test:
cd apps/backend && npm run test
cd apps/frontend && npm run test 2>/dev/null || echo "Frontend tests not configured"

# Запуск e2e тестов
test-e2e:
cd apps/backend && npm run test:e2e

# Линтинг кода
lint:
cd apps/backend && npm run lint
cd apps/frontend && npm run lint 2>/dev/null || echo "Frontend lint not configured"

# Форматирование кода
format:
cd apps/backend && npm run format
cd apps/frontend && npm run format 2>/dev/null || echo "Frontend format not configured"

# Создание .env файла из примера
env-setup:
@if [ ! -f apps/backend/.env ]; then \
cp apps/backend/.env.example apps/backend/.env; \
echo "✅ .env файл создан из .env.example"; \
echo "⚠️  Не забудьте заполнить apps/backend/.env своими значениями!"; \
else \
echo "ℹ️  .env файл уже существует"; \
fi

# Проверка здоровья сервисов
health-check:
@echo "🔍 Проверка здоровья сервисов..."
@curl -s http://localhost:3001/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend DOWN"
@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend DOWN"
@redis-cli ping > /dev/null 2>&1 && echo "✅ Redis OK" || echo "❌ Redis DOWN"

help:
@echo "Play Pulse - Команды для разработки:"
@echo ""
@echo "  make run            - Запуск локально (frontend + backend)"
@echo "  make run-docker     - Запуск в Docker (Redis + backend + frontend)"
@echo "  make stop-docker    - Остановка Docker контейнеров"
@echo "  make restart-docker - Перезапуск Docker контейнеров"
@echo "  make logs           - Просмотр логов всех сервисов"
@echo "  make logs-service service=<name> - Логи конкретного сервиса"
@echo "  make redis-start    - Запуск Redis локально"
@echo "  make redis-stop     - Остановка Redis локально"
@echo "  make install        - Установка всех зависимостей"
@echo "  make build          - Сборка проекта"
@echo "  make clean          - Очистка кэша и build артефактов"
@echo "  make test           - Запуск тестов"
@echo "  make test-e2e       - Запуск e2e тестов"
@echo "  make lint           - Линтинг кода"
@echo "  make format         - Форматирование кода"
@echo "  make env-setup      - Создание .env из примера"
@echo "  make health-check   - Проверка здоровья сервисов"
@echo "  make help           - Показать эту справку"
