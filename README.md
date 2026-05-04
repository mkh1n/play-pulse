# Culture Atlas — Платформа для открытия и оценки видеоигр

<div align="center">

**Full-stack веб-приложение для поиска, оценки и получения персонализированных рекомендаций видеоигр**

[![Frontend](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)](apps/frontend)
[![Backend](https://img.shields.io/badge/Backend-NestJS-red?logo=nestjs)](apps/backend)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📖 Оглавление

- [О проекте](#о-проекте)
- [Основные возможности](#основные-возможности)
- [Архитектура проекта](#архитектура-проекта)
- [Технологический стек](#технологический-стек)
- [Структура репозитория](#структура-репозитория)
- [Быстрый старт](#быстрый-старт)
- [Настройка окружения](#настройка-окружения)
- [API Документация](#api-документация)
- [Функциональные модули](#функциональные-модули)
- [Особенности реализации](#особенности-реализации)
- [Развёртывание](#развёртывание)
- [Лицензия](#лицензия)

---

## 🎯 О проекте

**Culture Atlas** — это современная full-stack платформа, предназначенная для помощи геймерам в поиске и оценке видеоигр. Проект объединяет в себе:

- **Каталог игр** с расширенным поиском и фильтрацией
- **Систему персональных рекомендаций** на основе предпочтений пользователя
- **Механику свайпов** для быстрого знакомства с новыми играми
- **Социальные функции**: оценки, избранное, списки желаемого
- **Новостную ленту** об игровой индустрии

Проект построен по архитектуре монорепозитория с разделением на frontend (Next.js) и backend (NestJS) приложения.

---

## ✨ Основные возможности

### Для пользователей

#### 🔍 Поиск и открытие игр
- Поиск игр по названию, жанрам, платформам, разработчикам
- Фильтрация по дате выхода, рейтингу, тегам
- Просмотр детальной информации: скриншоты, трейлеры, описания
- Информация о похожих играх

#### ⭐ Персональная коллекция
- Оценка игр по 10-балльной шкале
- Добавление в избранное
- Отметка пройденных игр
- Список "Хочу сыграть" (watchlist)
- Персональные заметки к каждой игре

#### 🎲 Рекомендательная система
- **Персонализированные рекомендации** на основе истории оценок
- **Бесконечная лента свайпов** для быстрого знакомства
- Умный алгоритм, учитывающий:
  - Предпочитаемые жанры и теги
  - Исторические оценки пользователя
  - Популярность и метаданные игр
  - Разнообразие выдачи

#### 📰 Новости
- Агрегация новостей из различных RSS-источников
- Фильтрация по источникам
- Удобный карточный интерфейс

#### 👤 Профиль пользователя
- Статистика игровых предпочтений
- Визуализация оценок (графики и диаграммы)
- История активности
- Управление профилем

### Технические особенности

- **Аутентификация и авторизация** через JWT токены
- **Кэширование запросов** на Redis для производительности
- **Валидация данных** с помощью class-validator
- **Swagger документация** API
- **Логирование запросов** для отладки
- **Обработка ошибок** через глобальные фильтры

---

## 🏗 Архитектура проекта

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Frontend (Next.js 14)                     │  │
│  │  • Server Components & Client Components              │  │
│  │  • Zustand State Management                           │  │
│  │  • TailwindCSS + CSS Modules                          │  │
│  │  • Next.js API Routes (Proxy)                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (NestJS)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Auth      │  │   Games     │  │  Recommendations    │  │
│  │   Module    │  │   Module    │  │      Module         │  │
│  │             │  │             │  │                     │  │
│  │ • JWT       │  │ • RAWG API  │  │ • Swipe Feed        │  │
│  │ • Passport  │  │ • Search    │  │ • Personalized      │  │
│  │ • bcrypt    │  │ • Filters   │  │ • Smart Ranking     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Users     │  │  Supabase   │  │      Cache          │  │
│  │   Module    │  │   Module    │  │     (Redis)         │  │
│  │             │  │             │  │                     │  │
│  │ • Profile   │  │ • Database  │  │ • TTL               │  │
│  │ • Settings  │  │ • Storage   │  │ • Invalidation      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Supabase   │  │   RAWG API   │  │    Redis     │
    │   (PostgreSQL│  │   (Games     │  │   (Cache)    │
    │    + Auth)   │  │    Data)     │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🛠 Технологический стек

### Frontend (`apps/frontend`)

| Категория | Технологии |
|-----------|------------|
| **Фреймворк** | Next.js 16 (App Router) |
| **Язык** | TypeScript 5.x |
| **UI библиотека** | React 18 |
| **Стилизация** | TailwindCSS 4.x, CSS Modules |
| **State Management** | Zustand 5.x |
| **HTTP клиент** | Axios |
| **Иконки** | Lucide React, React Icons |
| **Графики** | Recharts |
| **Парсинг** | Cheerio, fast-xml-parser |
| **Темы** | next-themes |
| **Утилиты** | use-debounce, react-paginate |

### Backend (`apps/backend`)

| Категория | Технологии |
|-----------|------------|
| **Фреймворк** | NestJS 11.x |
| **Язык** | TypeScript 5.x |
| **Аутентификация** | Passport, JWT, bcrypt |
| **Валидация** | class-validator, class-transformer |
| **HTTP клиент** | @nestjs/axios (Axios) |
| **База данных** | Supabase (PostgreSQL) |
| **Кэширование** | cache-manager + Redis |
| **Документация** | @nestjs/swagger |
| **Конфигурация** | @nestjs/config |
| **Тестирование** | Jest, Supertest |

### Инфраструктура

- **Monorepo**: apps/frontend + apps/backend
- **Запуск**: concurrently (параллельный запуск)
- **Контейнеризация**: Docker-ready
- **CI/CD**: GitHub Actions ready

---

## 📁 Структура репозитория

```
culture-atlas/
├── apps/
│   ├── frontend/              # Next.js приложение
│   │   ├── src/
│   │   │   ├── app/          # App Router страницы и API
│   │   │   │   ├── api/      # Proxy API routes
│   │   │   │   ├── auth/     # Страницы аутентификации
│   │   │   │   ├── games/    # Страницы игр
│   │   │   │   ├── news/     # Новостная лента
│   │   │   │   ├── profile/  # Профиль пользователя
│   │   │   │   ├── swipes/   # Лента свайпов
│   │   │   │   └── page.tsx  # Главная страница
│   │   │   ├── components/   # React компоненты
│   │   │   │   ├── AuthGuard/
│   │   │   │   ├── AuthPopup/
│   │   │   │   ├── GameActions/
│   │   │   │   ├── GameCard/
│   │   │   │   ├── GamesGrid/
│   │   │   │   ├── LoginForm/
│   │   │   │   ├── NewsCard/
│   │   │   │   ├── RegisterForm/
│   │   │   │   ├── RssSourcesPanel/
│   │   │   │   ├── ScreenshotGallery/
│   │   │   │   ├── SearchInput/
│   │   │   │   ├── StarRating/
│   │   │   │   ├── StatsCharts/
│   │   │   │   ├── SwipeCard/
│   │   │   │   └── SwipeControls/
│   │   │   ├── contexts/     # React Contexts
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── lib/          # Утилиты и константы
│   │   │   └── services/     # API сервисы
│   │   ├── public/           # Статические файлы
│   │   ├── middleware.ts     # Next.js middleware
│   │   ├── next.config.ts    # Конфигурация Next.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── backend/              # NestJS приложение
│       ├── src/
│       │   ├── auth/         # Модуль аутентификации
│       │   │   ├── dto/      # DTO для валидации
│       │   │   ├── guards/   # Guards защиты
│       │   │   ├── strategies/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   └── auth.module.ts
│       │   ├── games/        # Модуль игр
│       │   │   ├── dto/
│       │   │   ├── entities/
│       │   │   ├── games.controller.ts
│       │   │   ├── games.service.ts
│       │   │   └── games.module.ts
│       │   ├── users/        # Модуль пользователей
│       │   │   ├── dto/
│       │   │   ├── user.entity.ts
│       │   │   ├── users.controller.ts
│       │   │   ├── users.service.ts
│       │   │   └── users.module.ts
│       │   ├── recommendations/  # Модуль рекомендаций
│       │   │   ├── entities/
│       │   │   ├── recommendation.service.ts
│       │   │   ├── preferences.service.ts
│       │   │   ├── recommendations.controller.ts
│       │   │   └── recomendations.module.ts
│       │   ├── supabase/     # Supabase интеграция
│       │   ├── common/       # Общие утилиты
│       │   │   ├── filters/  # Exception filters
│       │   │   └── middleware/
│       │   ├── app.module.ts
│       │   ├── app.controller.ts
│       │   ├── app.service.ts
│       │   └── main.ts
│       ├── test/             # E2E тесты
│       ├── nest-cli.json
│       ├── package.json
│       └── tsconfig.json
│
├── .vscode/                  # Настройки VS Code
├── jest-e2e.json            # Конфигурация Jest
├── Makefile                 # Make команды
├── package.json             # Корневой package.json
└── README.md                # Этот файл
```

---

## 🚀 Быстрый старт

### Требования

- **Node.js** >= 18.x
- **npm** или **yarn**
- **Redis** (для кэширования на бэкенде)
- **Supabase** аккаунт (или PostgreSQL база)
- **RAWG API** ключ

### Установка

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd culture-atlas

# Установите зависимости для корневого проекта
npm install

# Установите зависимости для frontend
cd apps/frontend
npm install

# Установите зависимости для backend
cd ../backend
npm install
```

### Настройка переменных окружения

#### Backend (.env в `apps/backend/`)

```env
# Порт сервера
PORT=3001

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# RAWG API
RAWG_API_KEY=your_rawg_api_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Frontend (.env.local в `apps/frontend/`)

```env
# URL бэкенда
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# API ключи (если используются на клиенте)
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
```

### Запуск проекта

#### Вариант 1: Одной командой (рекомендуется)

```bash
# Из корня проекта
make run
```

Или вручную:

```bash
npx concurrently \
  "cd apps/frontend && npm run dev" \
  "cd apps/backend && npm run start:dev"
```

#### Вариант 2: Раздельный запуск

```bash
# Терминал 1 - Backend
cd apps/backend
npm run start:dev

# Терминал 2 - Frontend
cd apps/frontend
npm run dev
```

### Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger документация**: http://localhost:3001/api/docs

---

## 📚 API Документация

### Основные эндпоинты

#### Аутентификация (`/auth`)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/auth/register` | Регистрация нового пользователя |
| POST | `/auth/login` | Вход в систему |
| GET | `/auth/profile` | Получение профиля (защищено) |

#### Игры (`/games`)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/games` | Получить список игр с фильтрацией |
| GET | `/games/:id` | Получить детальную информацию об игре |
| GET | `/games/:id/screenshots` | Получить скриншоты игры |
| GET | `/games/:id/videos` | Получить видеоматериалы |

#### Рекомендации (`/recommendations`)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/recommendations/personalized` | Персонализированные рекомендации |
| GET | `/recommendations/swipe` | Лента для свайпов |
| POST | `/recommendations/preferences` | Обновить предпочтения |

#### Пользователи (`/users`)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/users/profile` | Профиль текущего пользователя |
| PUT | `/users/profile` | Обновление профиля |
| GET | `/users/statistics` | Статистика пользователя |

### Параметры запросов

#### Фильтрация игр

```
GET /games?page=1&pageSize=20&search=witcher&ordering=-rating&genres=4&platforms=18
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | number | Номер страницы |
| `pageSize` | number | Количество элементов на странице |
| `search` | string | Поисковый запрос |
| `ordering` | string | Сортировка (`-rating`, `-released`, `-added`, `name`) |
| `genres` | string | ID жанров (через запятую) |
| `platforms` | string | ID платформ (через запятую) |
| `dates` | string | Диапазон дат (`2024-01-01,2024-12-31`) |

---

## 🔧 Функциональные модули

### 1. Модуль аутентификации (Auth Module)

**Расположение**: `apps/backend/src/auth/`

**Ответственность**:
- Регистрация и вход пользователей
- Генерация и валидация JWT токенов
- Хеширование паролей (bcrypt)
- Защита роутов через Guards

**Ключевые файлы**:
- `auth.service.ts` — бизнес-логика аутентификации
- `auth.controller.ts` — HTTP обработчики
- `guards/jwt-auth.guard.ts` — защита роутов
- `strategies/jwt.strategy.ts` — стратегия Passport

### 2. Модуль игр (Games Module)

**Расположение**: `apps/backend/src/games/`

**Ответственность**:
- Интеграция с RAWG API
- Кэширование данных игр
- Поиск и фильтрация
- Умная сортировка с учётом качества метаданных

**Особенности**:
- Пост-обработка результатов RAWG для фильтрации "мусора"
- Фоновое кэширование популярных игр
- Пороговые значения для отсеивания малоинформативных игр

### 3. Модуль рекомендаций (Recommendations Module)

**Расположение**: `apps/backend/src/recommendations/`

**Ответственность**:
- Генерация персонализированных рекомендаций
- Бесконечная лента свайпов
- Анализ предпочтений пользователя
- Гибридная система ранжирования

**Алгоритм рекомендаций**:
1. Сбор сигналов пользователя (оценки, жанры, теги)
2. Анализ высоко оценённых игр
3. Поиск игр с похожими характеристиками
4. Расчёт гибридного скоринга
5. Формирование выдачи с объяснением рекомендаций

### 4. Модуль пользователей (Users Module)

**Расположение**: `apps/backend/src/users/`

**Ответственность**:
- Управление профилями пользователей
- Хранение пользовательских данных
- Статистика и аналитика

### 5. Supabase модуль

**Расположение**: `apps/backend/src/supabase/`

**Ответственность**:
- Подключение к Supabase
- Работа с базой данных
- Аутентификация через Supabase Auth

---

## 💡 Особенности реализации

### Frontend

#### Прокси для API запросов
Для обхода CORS и защиты API ключей реализованы server-side API routes в Next.js:

```
Client → /api/* (Next.js) → Backend API → External APIs
```

#### Управление состоянием
Zustand используется для глобального состояния:
- `userDataStore` — данные пользователя (оценки, избранное, заметки)
- `mediaCacheStore` — кэш данных из внешних API
- `AuthContext` — контекст аутентификации

#### Компоненты
Все компоненты разделены по функциональности:
- **AuthGuard** — защита приватных роутов
- **GameActions** — действия с игрой (оценка, избранное)
- **SwipeCard/SwipeControls** — механика свайпов
- **StatsCharts** — визуализация статистики

### Backend

#### Кэширование
Глобальное кэширование через Redis:
- TTL: 5 минут по умолчанию
- Максимум: 100 ключей
- Автоматическая инвалидация

#### Валидация
Глобальная валидация DTO с помощью `class-validator`:
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
}));
```

#### Обработка ошибок
Централизованная обработка через глобальные фильтры:
```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

#### Логирование
Middleware для логирования всех входящих запросов:
```typescript
consumer.apply(RequestLoggerMiddleware).forRoutes('*');
```

---

## 🌐 Развёртывание

### Frontend (Vercel)

1. Подключите репозиторий к Vercel
2. Настройте переменные окружения
3. Deploy автоматически при push в main

### Backend (Любой Node.js хостинг)

#### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY apps/backend/package*.json ./
RUN npm install --production

COPY apps/backend/ ./
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

#### Переменные окружения для продакшена

```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=<your_url>
SUPABASE_KEY=<your_key>
JWT_SECRET=<secure_secret>
RAWG_API_KEY=<your_key>
REDIS_URL=<redis_connection_string>
```

---

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. Подробнее см. в файле [LICENSE](LICENSE).

---

## 🤝 Вклад в проект

Мы приветствуем вклад в развитие проекта! Пожалуйста:

1. Форкните репозиторий
2. Создайте ветку для вашей фичи (`git checkout -b feature/amazing-feature`)
3. Закоммитьте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в удалённый репозиторий (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## 📞 Контакты

- **Website**: [ваш сайт]
- **Email**: [ваш email]
- **Telegram**: [ваш телеграм]

---

<div align="center">

**Made with ❤️ using Next.js, NestJS and TypeScript**

[⬆ Вернуться к началу](#culture-atlas--платформа-для-открытия-и-оценки-видеоигр)

</div>
