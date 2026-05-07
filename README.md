# Play Pulse - Игровая платформа с рекомендациями

🎮 Современная веб-платформа для отслеживания игровых предпочтений и получения персонализированных рекомендаций игр.

## 🚀 Особенности

- **Персонализированные рекомендации** - умный алгоритм подбора игр на основе ваших предпочтений
- **Отслеживание игрового прогресса** - отмечайте сыгранные игры и ставьте оценки
- **Интеграция с RAWG API** - обширная база данных игр
- **Безопасная аутентификация** - JWT токены с bcrypt хешированием
- **Кэширование Redis** - высокая производительность благодаря Redis
- **Swagger документация** - полная API документация

## 📋 Технологический стек

### Backend
- **NestJS 11** - прогрессивный Node.js фреймворк
- **TypeScript** - типизированный JavaScript
- **Supabase/PostgreSQL** - облачная база данных
- **Redis** - кэширование данных
- **Passport.js + JWT** - аутентификация
- **class-validator** - валидация DTO
- **Swagger** - API документация

### Frontend
- **Next.js 16** - React фреймворк
- **TypeScript** - типизация
- **Tailwind CSS** - стилизация

### DevOps
- **Docker & Docker Compose** - контейнеризация
- **Redis 7** - in-memory хранилище

## 🛠️ Быстрый старт

### Требования

- Node.js 20+
- npm или yarn
- Docker и Docker Compose (рекомендуется)
- Или Redis локально (альтернатива Docker)

### Вариант 1: Запуск с Docker (Рекомендуется)

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd play-pulse

# 2. Создайте .env файл из примера
cp apps/backend/.env.example apps/backend/.env

# 3. Отредактируйте .env и заполните своими значениями
# Обязательно укажите:
# - SUPABASE_URL и SUPABASE_KEY
# - JWT_SECRET (случайная строка)
# - RAWG_API_KEY (получите на https://rawg.io/apidocs)

# 4. Запустите проект
make run-docker

# Проект доступен по адресам:
# - Frontend: http://localhost:3000
# - Backend:  http://localhost:3001
# - Swagger:  http://localhost:3001/api
# - Redis:    localhost:6379
```

### Вариант 2: Локальный запуск (без Docker)

```bash
# 1. Установите Redis (если не установлен)
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server
# Windows: скачайте с https://github.com/microsoftarchive/redis/releases

# 2. Запустите Redis
make redis-start
# или вручную: redis-server

# 3. Создайте .env файл
make env-setup

# 4. Установите зависимости
make install

# 5. Запустите проект
make run
```

## 📚 Основные команды

```bash
make help            # Показать все доступные команды
make run-docker      # Запуск в Docker (Redis + Backend + Frontend)
make stop-docker     # Остановка Docker контейнеров
make run             # Запуск локально (без Docker)
make install         # Установка всех зависимостей
make build           # Сборка проекта
make test            # Запуск тестов
make lint            # Линтинг кода
make format          # Форматирование кода
make logs            # Просмотр логов Docker
make health-check    # Проверка здоровья сервисов
make clean           # Очистка кэша и build артефактов
```

## 🔧 Конфигурация

### Переменные окружения (apps/backend/.env)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `SUPABASE_URL` | URL вашего Supabase проекта | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | API ключ Supabase | `eyJhbG...` |
| `JWT_SECRET` | Секретный ключ для JWT (ОБЯЗАТЕЛЬНО!) | `your-super-secret-key` |
| `PORT` | Порт backend сервера | `3001` |
| `FRONTEND_URL` | URL фронтенда для CORS | `http://localhost:3000` |
| `REDIS_HOST` | Хост Redis | `localhost` или `redis` |
| `REDIS_PORT` | Порт Redis | `6379` |
| `REDIS_PASSWORD` | Пароль Redis (если есть) | `` |
| `CACHE_TTL` | Время жизни кэша в секундах | `300` |
| `CACHE_MAX` | Максимальное количество ключей в кэше | `100` |
| `RAWG_API_KEY` | API ключ RAWG для данных об играх | `xxx` |

## 📖 API Документация

После запуска backend сервера Swagger документация доступна по адресу:
**http://localhost:3001/api**

### Основные эндпоинты

- `POST /auth/register` - Регистрация пользователя
- `POST /auth/login` - Вход пользователя
- `GET /games` - Получение списка игр
- `GET /games/:id` - Получение информации об игре
- `POST /games/:id/action` - Добавление действия с игрой
- `GET /recommendations` - Получение рекомендаций
- `GET /preferences` - Получение предпочтений пользователя

## 🏗️ Архитектура проекта

```
play-pulse/
├── apps/
│   ├── backend/           # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/      # Модуль аутентификации
│   │   │   ├── games/     # Модуль игр
│   │   │   ├── users/     # Модуль пользователей
│   │   │   ├── recommendations/  # Модуль рекомендаций
│   │   │   ├── supabase/  # Supabase клиент
│   │   │   ├── common/    # Общие фильтры, middleware
│   │   │   └── main.ts    # Точка входа
│   │   ├── .env.example   # Пример переменных окружения
│   │   └── Dockerfile
│   └── frontend/          # Next.js frontend
│       └── Dockerfile
├── docker-compose.yml     # Docker конфигурация
├── Makefile              # Команды для разработки
└── README.md
```

## 🧪 Тестирование

```bash
# Запуск unit тестов
make test

# Запуск e2e тестов
make test-e2e
```

## 🔐 Безопасность

- Все пароли хешируются с помощью bcrypt
- JWT токены с сроком действия 7 дней
- Валидация всех входящих данных
- CORS настроен для конкретного домена
- **Важно:** Никогда не коммитьте `.env` файл с реальными секретами!

## 📝 Лицензия

Этот проект является дипломной работой.

## 👨‍💻 Автор

Мухин

---

## ❓ Troubleshooting

### Ошибка подключения к Redis
```bash
# Проверьте, запущен ли Redis
make health-check

# Если используете Docker, убедитесь что контейнер redis работает
docker ps | grep redis

# Перезапустите Redis
make stop-docker && make run-docker
```

### Ошибка "JWT_SECRET is required"
Убедитесь, что в файле `apps/backend/.env` установлена переменная `JWT_SECRET`:
```
JWT_SECRET=your-super-secret-key-change-this-in-production
```

### Ошибка подключения к Supabase
1. Проверьте правильность `SUPABASE_URL` и `SUPABASE_KEY`
2. Убедитесь, что таблицы созданы в базе данных
3. Проверьте интернет соединение

### Проблемы с портами
Если порты 3000 или 3001 заняты, измените их в `.env`:
```
PORT=3002
FRONTEND_URL=http://localhost:3001
```
