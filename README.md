# PlayPulse — Платформа для открытия и отслеживания игр

## 📖 Оглавление

1. [Обзор проекта](#обзор-проекта)
2. [Архитектура](#архитектура)
3. [Технологический стек](#технологический-стек)
4. [Структура проекта](#структура-проекта)
5. [Backend (NestJS)](#backend-nestjs)
   - [Модули](#модули-backend)
   - [API Endpoints](#api-endpoints-backend)
   - [DTO и Entities](#dto-и-entities)
   - [Guards и Strategies](#guards-и-strategies)
   - [Middleware и Filters](#middleware-и-filters)
   - [Proxy к RAWG API](#proxy-к-rawg-api)
6. [Frontend (Next.js)](#frontend-nextjs)
   - [Страницы и маршруты](#страницы-и-маршруты)
   - [API Routes (Proxy)](#api-routes-proxy)
   - [Компоненты](#компоненты)
   - [Contexts и Hooks](#contexts-и-hooks)
   - [Services](#services)
7. [База данных (Supabase)](#база-данных-supabase)
8. [Аутентификация и авторизация](#аутентификация-и-авторизация)
9. [Система рекомендаций](#система-рекомендаций)
10. [Кэширование](#кэширование)
11. [Запуск проекта](#запуск-проекта)
12. [Переменные окружения](#переменные-окружения)

---

## 📋 Обзор проекта

**PlayPulse** — это современная веб-платформа для открытия, поиска и отслеживания видеоигр. Приложение предоставляет пользователям возможность:

- 🔍 **Поиск игр** через интеграцию с RAWG API (крупнейшая база данных игр)
- ❤️ **Лайки/Дизлайки** — система предпочтений для персонализированных рекомендаций
- ⭐ **Оценки игр** — рейтинговая система от 1 до 10
- 📝 **Статусы прохождения** — отслеживание прогресса (играю, завершено, брошено)
- 🛒 **Статусы покупки** — управление покупками (куплено, хочу купить)
- 📱 **Свайпы** — Tinder-подобный интерфейс для быстрого выбора игр
- 📰 **Новости** — агрегация игровых новостей из RSS-источников
- 💾 **Wishlist** — список желаемого
- 🎮 **Персональные рекомендации** — на основе поведения пользователя

### Ключевая особенность: Proxy-архитектура

Важно отметить, что **все запросы к API бэкенда идут не напрямую**, а через **Next.js API Routes proxy**. Это означает:

```
Frontend (Browser) 
    ↓
Next.js API Routes (/api/*) ← Proxy layer
    ↓
NestJS Backend (http://localhost:3001)
    ↓
RAWG API (через rawg-proxy)
```

Такая архитектура обеспечивает:
- Безопасность (скрытие реальных endpoint'ов бэкенда)
- Контроль доступа и валидацию на уровне proxy
- Возможность кэширования и оптимизации запросов
- Единую точку входа для всех API вызовов

---

## 🏗 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Pages     │  │  Components  │  │   API Routes (Proxy) │   │
│  │  /          │  │  GameCard    │  │   /api/games         │   │
│  │  /games     │  │  SwipeCard   │  │   /api/auth          │   │
│  │  /swipes    │  │  AuthGuard   │  │   /api/users         │   │
│  │  /profile   │  │  NewsCard    │  │   /api/news          │   │
│  │  /news      │  │  StatsCharts │  │   /api/recommend...  │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   Auth   │  │  Games   │  │  Users   │  │ Recommendations│  │
│  │  Module  │  │  Module  │  │  Module  │  │     Module     │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│                              ↓                                   │
│                    ┌───────────────────┐                        │
│                    │   RAWG Proxy      │                        │
│                    │ (external service)│                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE & CACHE                           │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   Supabase       │         │   Redis Cache    │              │
│  │   (PostgreSQL)   │         │                  │              │
│  └──────────────────┘         └──────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Технологический стек

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| NestJS | ^11.0.1 | Основной фреймворк |
| TypeScript | ^5.7.3 | Язык разработки |
| @nestjs/jwt | ^11.0.2 | JWT токены |
| @nestjs/passport | ^11.0.5 | Passport стратегия |
| @nestjs/cache-manager | ^3.1.0 | Кэширование |
| cache-manager-redis-yet | ^5.1.5 | Redis хранилище |
| @supabase/supabase-js | ^2.89.0 | Работа с БД |
| class-validator | ^0.14.3 | Валидация DTO |
| @nestjs/swagger | ^11.2.3 | API документация |
| bcrypt | ^6.0.0 | Хеширование паролей |

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js | ^16.1.1 | React фреймворк |
| React | 18.3.1 | UI библиотека |
| TypeScript | ^5 | Типизация |
| TailwindCSS | ^4.1.17 | Стилизация |
| Zustand | ^5.0.9 | State management |
| Recharts | ^3.6.0 | Графики и статистика |
| @supabase/supabase-js | ^2.105.4 | Клиент Supabase |
| cheerio | ^1.1.2 | Парсинг HTML |
| fast-xml-parser | ^5.5.8 | Парсинг RSS/XML |

---

## 📁 Структура проекта

```
/workspace
├── apps/
│   ├── backend/                    # NestJS приложение
│   │   ├── src/
│   │   │   ├── auth/               # Модуль аутентификации
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   └── jwt.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guardl.ts
│   │   │   │   │   └── optional-jwt.ts
│   │   │   │   └── dto/
│   │   │   │       ├── login.dto.ts
│   │   │   │       └── register.dto.ts
│   │   │   ├── common/             # Общие утилиты
│   │   │   │   └── filters/
│   │   │   │       ├── http-exception.filter.ts
│   │   │   │       └── middleware/
│   │   │   │           └── request-logger.middleware.ts
│   │   │   ├── games/              # Модуль игр
│   │   │   │   ├── games.controller.ts
│   │   │   │   ├── games.service.ts
│   │   │   │   ├── games.module.ts
│   │   │   │   ├── entities/
│   │   │   │   │   └── game.entity.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── game-meta.dto.ts
│   │   │   │   │   ├── get-games.dto.ts
│   │   │   │   │   ├── rate-game.dto.ts
│   │   │   │   │   └── update-game-status.dto.ts
│   │   │   │   └── rawg-proxy.ts   # Proxy к RAWG API
│   │   │   ├── recommendations/    # Модуль рекомендаций
│   │   │   │   ├── recommendations.controller.ts
│   │   │   │   ├── recommendation.service.ts
│   │   │   │   ├── preferences.controller.ts
│   │   │   │   ├── preferences.service.ts
│   │   │   │   ├── recommendations.module.ts
│   │   │   │   └── preferences.module.ts
│   │   │   ├── users/              # Модуль пользователей
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── user-profile.entity.ts
│   │   │   │   └── dto/
│   │   │   │       ├── update-user-dto.ts
│   │   │   │       └── update-profile.dto.ts
│   │   │   ├── supabase/           # Supabase клиент
│   │   │   │   ├── supabase.module.ts
│   │   │   │   ├── supabase.service.ts
│   │   │   │   └── supabase.constants.ts
│   │   │   ├── app.module.ts       # Главный модуль
│   │   │   ├── app.controller.ts
│   │   │   ├── app.service.ts
│   │   │   └── main.ts             # Точка входа
│   │   ├── test/                   # E2E тесты
│   │   ├── jest.config.ts
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                   # Next.js приложение
│       ├── src/
│       │   ├── app/                # App Router страницы
│       │   │   ├── page.tsx                    # Главная страница
│       │   │   ├── layout.tsx                  # Корневой layout
│       │   │   ├── ClientLayout.tsx            # Клиентский layout
│       │   │   ├── auth/page.tsx               # Страница авторизации
│       │   │   ├── games/
│       │   │   │   ├── page.tsx                # Каталог игр
│       │   │   │   ├── GamesPageContent.tsx    # Контент каталога
│       │   │   │   └── [id]/page.tsx           # Детали игры
│       │   │   ├── swipes/page.tsx             # Свайпы (Tinder-like)
│       │   │   ├── profile/page.tsx            # Профиль пользователя
│       │   │   ├── news/page.tsx               # Новости
│       │   │   ├── not-found.tsx               # 404 страница
│       │   │   └── api/                        # API Routes (PROXY!)
│       │   │       ├── auth/
│       │   │       │   ├── check/route.ts
│       │   │       │   ├── login/route.ts
│       │   │       │   ├── logout/route.ts
│       │   │       │   ├── register/route.ts
│       │   │       │   ├── sync/route.ts
│       │   │       │   └── validate/route.ts
│       │   │       ├── games/
│       │   │       │   ├── route.ts
│       │   │       │   ├── [id]/route.ts
│       │   │       │   ├── [id]/like/route.ts
│       │   │       │   ├── [id]/dislike/route.ts
│       │   │       │   ├── [id]/rate/route.ts
│       │   │       │   ├── [id]/status/route.ts
│       │   │       │   ├── [id]/wishlist/route.ts
│       │   │       │   ├── [id]/purchase/route.ts
│       │   │       │   ├── genres/route.ts
│       │   │       │   └── platforms/route.ts
│       │   │       ├── users/me/
│       │   │       │   ├── route.ts
│       │   │       │   ├── profile/route.ts
│       │   │       │   └── games/route.ts
│       │   │       ├── recommendations/
│       │   │       │   ├── swipes/route.ts
│       │   │       │   ├── swipe-action/route.ts
│       │   │       │   ├── swipe-action/batch/route.ts
│       │   │       │   ├── similar/[gameId]/route.ts
│       │   │       │   └── popular/route.ts
│       │   │       ├── preferences/game-actions/route.ts
│       │   │       ├── news/rss/route.ts
│       │   │       ├── news/rss/utils.ts
│       │   │       ├── deals/route.ts
│       │   │       ├── crop-image/route.ts
│       │   │       └── test/route.ts
│       │   │
│       │   ├── components/         # React компоненты
│       │   │   ├── GameCard/GameCard.tsx
│       │   │   ├── GamesGrid/GamesGrid.tsx
│       │   │   ├── SwipeCard/SwipeCard.tsx
│       │   │   ├── SwipeControls/SwipeControls.tsx
│       │   │   ├── GameActions/GameActions.tsx
│       │   │   ├── SearchInput/SearchInput.tsx
│       │   │   ├── StarRating/StarRaing.tsx
│       │   │   ├── ScreenshotGallery/ScreenshotGallery.tsx
│       │   │   ├── StatsCharts/StatsCharts.tsx
│       │   │   ├── NewsCard/NewsCard.tsx
│       │   │   ├── RssSourcesPanel/RssSourcesPanel.tsx
│       │   │   ├── NavigationBlock/NavigationBlock.tsx
│       │   │   ├── LoginForm/LoginForm.tsx
│       │   │   ├── RegisterForm/RegisterForm.tsx
│       │   │   ├── AuthPopup/AuthPopup.tsx
│       │   │   ├── AuthGuard/AuthGuard.tsx
│       │   │   └── profile/
│       │   │       ├── ProfileHeader.tsx
│       │   │       ├── ProfileGameCard.tsx
│       │   │       ├── ProfileGamesGrid.tsx
│       │   │       └── ProfileSettingsModal.tsx
│       │   │
│       │   ├── contexts/           # React Contexts
│       │   │   ├── AuthContext.tsx       # Аутентификация
│       │   │   └── GameActionsContexts.tsx # Действия с играми
│       │   │
│       │   ├── hooks/              # Custom hooks
│       │   │   └── useMediaActions.ts
│       │   │
│       │   ├── services/           # API сервисы
│       │   │   ├── gameService.ts        # Игры API
│       │   │   └── scrollService.ts      # Скролл утилиты
│       │   │
│       │   └── lib/                # Утилиты
│       │       ├── supabase.ts           # Supabase клиент
│       │       └── platforms.ts          # Список платформ
│       │
│       ├── public/               # Статические файлы
│       │   ├── data/
│       │   ├── favicon/
│       │   ├── icons/
│       │   └── images/
│       ├── middleware.ts         # Next.js middleware
│       ├── next.config.ts
│       └── package.json
│
├── package.json                  # Root package (монорепо)
└── README.md
```

---

## 🔧 Backend (NestJS)

### Модули Backend

#### 1. AppModule (`src/app.module.ts`)
Главный модуль приложения, объединяющий все остальные модули.

**Импорты:**
- `ConfigModule` — глобальная конфигурация из .env
- `CacheModule` — Redis кэширование (глобальное)
- `SupabaseModule` — подключение к базе данных
- `AuthModule` — аутентификация
- `UsersModule` — пользователи
- `GamesModule` — игры
- `RecommendationsModule` — рекомендации

**Middleware:**
- `RequestLoggerMiddleware` — логирует все входящие запросы

---

#### 2. AuthModule (`src/auth/auth.module.ts`)
Отвечает за регистрацию, вход и JWT аутентификацию.

**Компоненты:**
| Файл | Описание |
|------|----------|
| `auth.controller.ts` | Контроллер endpoints `/auth/*` |
| `auth.service.ts` | Логика регистрации/логина |
| `jwt.strategy.ts` | Passport стратегия для JWT |
| `jwt-auth.guardl.ts` | Guard для защиты роутов |
| `optional-jwt.ts` | Опциональная JWT проверка |
| `login.dto.ts` | DTO для логина |
| `register.dto.ts` | DTO для регистрации |

**Конфигурация JWT:**
- Секрет: `JWT_SECRET` из .env
- Время жизни токена: **7 дней**

---

#### 3. GamesModule (`src/games/games.module.ts`)
Управление играми: получение списка, деталей, фильтрация.

**Компоненты:**
| Файл | Описание |
|------|----------|
| `games.controller.ts` | Контроллер endpoints `/games/*` |
| `games.service.ts` | Сервис работы с играми |
| `rawg-proxy.ts` | Proxy к внешнему RAWG API |
| `game.entity.ts` | Entity игры |
| `dto/*.ts` | DTO для запросов |

**Зависимости:**
- `HttpModule` — HTTP запросы к RAWG
- `SupabaseModule` — кэш в БД
- `RecommendationsModule` — связь с рекомендациями

---

#### 4. UsersModule (`src/users/users.module.ts`)
Профили пользователей и их данные.

**Компоненты:**
| Файл | Описание |
|------|----------|
| `users.controller.ts` | Контроллер endpoints `/users/*` |
| `users.service.ts` | Сервис пользователей |
| `user.entity.ts` | Entity пользователя |
| `user-profile.entity.ts` | Entity профиля |
| `dto/*.ts` | DTO для обновления |

---

#### 5. RecommendationsModule (`src/recommendations/recommendations.module.ts`)
Система рекомендаций и пользовательских предпочтений.

**Компоненты:**
| Файл | Описание |
|------|----------|
| `recommendations.controller.ts` | Свайпы, популярные, похожие игры |
| `recommendation.service.ts` | Логика подбора рекомендаций |
| `preferences.controller.ts` | Управление предпочтениями |
| `preferences.service.ts` | Обработка лайков/оценок/статусов |

**Зависимости:**
- `HttpModule` — запросы к RAWG для рекомендаций
- `SupabaseModule` — хранение действий пользователей
- `GamesModule` — доступ к данным игр

---

#### 6. SupabaseModule (`src/supabase/supabase.module.ts`)
Глобальный модуль для подключения к Supabase (PostgreSQL).

**Провайдеры:**
- `SUPABASE_CLIENT` — экземпляр Supabase клиента
- `SupabaseService` — обёртка для удобной работы

**Конфигурация:**
- URL: `SUPABASE_URL`
- Ключ: `SUPABASE_KEY` или `SUPABASE_SERVICE_KEY`

---

### API Endpoints Backend

#### Auth Controller (`/auth`)

| Метод | Endpoint | Описание | Auth | DTO |
|-------|----------|----------|------|-----|
| POST | `/auth/register` | Регистрация нового пользователя | ❌ | `RegisterDto` |
| POST | `/auth/login` | Вход в систему | ❌ | `LoginDto` |
| GET | `/auth/validate` | Проверка валидности токена | ✅ | - |
| POST | `/auth/logout` | Выход из системы | ❌ | - |

**RegisterDto:**
```typescript
{
  login: string;      // Уникальный логин
  password: string;   // Пароль (хешируется bcrypt)
}
```

**LoginDto:**
```typescript
{
  login: string;
  password: string;
}
```

**Ответы:**
```json
// Успешный логин/регистрация
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "login": "username",
    "username": "Username",
    "created_at": "2024-01-01T00:00:00Z"
  }
}

// Валидация токена
{
  "valid": true,
  "user": {
    "id": 1,
    "login": "username",
    "username": "Username"
  }
}
```

---

#### Games Controller (`/games`)

| Метод | Endpoint | Описание | Auth | Параметры |
|-------|----------|----------|------|-----------|
| GET | `/games` | Получить список игр | ❌ | Query params |
| GET | `/games/:id` | Получить игру по ID | ❌ | `id: number` |
| POST | `/games/:id/like` | Поставить лайк | ✅ | `GameMetaDto` |
| DELETE | `/games/:id/like` | Убрать лайк | ✅ | - |
| POST | `/games/:id/dislike` | Поставить дизлайк | ✅ | `GameMetaDto` |
| DELETE | `/games/:id/dislike` | Убрать дизлайк | ✅ | - |
| POST | `/games/:id/wishlist` | Добавить в wishlist | ✅ | `GameMetaDto` |
| DELETE | `/games/:id/wishlist` | Убрать из wishlist | ✅ | - |
| POST | `/games/:id/rate` | Поставить оценку | ✅ | `RateGameDto` |
| DELETE | `/games/:id/rate` | Удалить оценку | ✅ | - |
| GET | `/games/:id/my-rating` | Получить свою оценку | ✅ | - |
| POST | `/games/:id/status` | Обновить статус прохождения | ✅ | `UpdateGameStatusDto` |
| POST | `/games/:id/purchase` | Обновить статус покупки | ✅ | `UpdatePurchaseDto` |

**Query параметры для GET /games:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | number | Номер страницы (default: 1) |
| `pageSize` | number | Размер страницы (default: 20) |
| `search` | string | Поиск по названию |
| `ordering` | string | Сортировка (default: `-rating`) |
| `genres` | string | Фильтр по жанрам (ID через запятую) |
| `platforms` | string | Фильтр по платформам |
| `tags` | string | Фильтр по тегам |
| `dates` | string | Диапазон дат выхода (YYYY-MM-DD,YYYY-MM-DD) |
| `developers` | string | Фильтр по разработчикам |
| `publishers` | string | Фильтр по издателям |

**Варианты ordering:**
- `-rating` — по рейтингу (убывание)
- `-released` — по дате выхода (новые сначала)
- `name` — по названию (A-Z)
- `-name` — по названию (Z-A)
- `-metacritic` — по Metacritic
- `-added` — по популярности (количество добавлений)

**GameMetaDto:**
```typescript
{
  gameName?: string;           // Название игры
  gameImage?: string;          // URL изображения
  genres?: Array<{ id?: string|number; name?: string }>;
  tags?: Array<{ id?: string|number; name?: string }>;
}
```

**RateGameDto:**
```typescript
{
  rating: number;              // Оценка 1-10
  gameName?: string;
  gameImage?: string;
  genres?: Array<{ id?: string|number; name?: string }>;
  tags?: Array<{ id?: string|number; name?: string }>;
}
```

**UpdateGameStatusDto:**
```typescript
{
  status: 'not_played' | 'playing' | 'completed' | 'dropped';
  gameName?: string;
  gameImage?: string;
  genres?: Array<{ id?: string|number; name?: string }>;
  tags?: Array<{ id?: string|number; name?: string }>;
}
```

**UpdatePurchaseDto:**
```typescript
{
  purchase: 'owned' | 'not_owned' | 'want_to_buy';
  gameName?: string;
  gameImage?: string;
  genres?: Array<{ id?: string|number; name?: string }>;
  tags?: Array<{ id?: string|number; name?: string }>;
}
```

**Пример ответа GET /games:**
```json
{
  "count": 500,
  "next": "/games?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "slug": "the-witcher-3",
      "name": "The Witcher 3: Wild Hunt",
      "released": "2015-05-19",
      "background_image": "https://...",
      "rating": 9.5,
      "rating_top": 10,
      "metacritic": 93,
      "playtime": 50,
      "genres": [{"id": 4, "name": "Action"}, {"id": 5, "name": "RPG"}],
      "tags": [{"id": 1, "name": "Open World"}],
      "parent_platforms": [{"platform": {"id": 1, "name": "PC"}}],
      "added": 15000,
      "suggestions_count": 10,
      "reviews_count": 500
    }
  ]
}
```

---

#### Users Controller (`/users`)

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/users/me` | Получить свой профиль | ✅ |
| PUT | `/users/me` | Обновить свои данные | ✅ |
| PUT | `/users/me/profile` | Обновить профиль | ✅ |
| GET | `/users/me/games` | Получить свои игры | ✅ |
| GET | `/users/:id` | Публичный профиль | ❌ |

**Ответ GET /users/me:**
```json
{
  "user": {
    "id": 1,
    "login": "username",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "profile": {
    "name": "Имя",
    "avatar_url": "https://...",
    "bio": "О себе"
  }
}
```

**UpdateUserDto:**
```typescript
{
  username?: string;
}
```

**UpdateProfileDto:**
```typescript
{
  name?: string;
  avatar_url?: string;
  bio?: string;
}
```

---

#### Recommendations Controller (`/recommendations`)

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/recommendations/swipes` | Получить игры для свайпов | ✅ |
| POST | `/recommendations/swipe-action/batch` | Обработать пачку свайпов | ✅ |
| GET | `/recommendations/similar/:gameId` | Похожие игры | ✅ |
| GET | `/recommendations/popular` | Популярные игры | ✅ |

**Параметры GET /recommendations/swipes:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `limit` | number | Количество игр (default: 10) |
| `exclude` | string | Исключить ID игр (через запятую) |

**Body POST /recommendations/swipe-action/batch:**
```typescript
{
  actions: Array<{
    gameId: number;
    gameName: string;
    gameImage?: string;
    genres?: Array<{ id?: string|number; name?: string }>;
    tags?: Array<{ id?: string|number; name?: string }>;
    action: 'like' | 'dislike';
  }>
}
```

**Ответ:**
```json
{
  "success": true,
  "processed": 5,
  "successCount": 5,
  "failCount": 0,
  "results": [
    {
      "gameId": 123,
      "action": "like",
      "success": true
    }
  ]
}
```

---

#### Preferences Controller (`/preferences`)

| Метод | Endpoint | Описание | Auth | Кэш |
|-------|----------|----------|------|-----|
| GET | `/preferences/game-actions` | Получить все действия пользователя | ✅ | 60 сек |

**Ответ:**
```json
{
  "likes": [...],
  "dislikes": [...],
  "wishlist": [...],
  "ratings": [...],
  "statuses": [...]
}
```

---

### DTO и Entities

#### Game Entity (`src/games/entities/game.entity.ts`)
```typescript
{
  id: number;
  slug: string;
  name: string;
  released: string;
  background_image: string;
  rating: number;
  rating_top: number;
  metacritic: number;
  playtime: number;
  genres: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  platforms: Array<{ platform: { id: number; name: string } }>;
  added: number;
  suggestions_count: number;
  reviews_count: number;
}
```

#### User Entity (`src/users/user.entity.ts`)
```typescript
{
  id: number;
  login: string;
  password_hash: string;
  created_at: string;
}
```

#### User Profile Entity (`src/users/user-profile.entity.ts`)
```typescript
{
  user_id: number;
  name: string;
  avatar_url: string;
  bio: string;
}
```

---

### Guards и Strategies

#### JwtStrategy (`src/auth/strategies/jwt.strategy.ts`)
Passport стратегия для проверки JWT токенов.

**Конфигурация:**
- Извлекает токен из заголовка `Authorization: Bearer <token>`
- Проверяет подпись используя `JWT_SECRET`
- Добавляет пользователя в `req.user`

#### JwtAuthGuard (`src/auth/guards/jwt-auth.guardl.ts`)
Guard для защиты роутов, требующих аутентификации.

**Использование:**
```typescript
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
```

#### OptionalJwtGuard (`src/auth/guards/optional-jwt.ts`)
Guard для роутов, где аутентификация опциональна.

---

### Middleware и Filters

#### RequestLoggerMiddleware (`src/common/filters/middleware/request-logger.middleware.ts`)
Логирует все входящие запросы.

**Логирует:**
- Метод запроса
- URL
- IP адрес
- User-Agent
- Время выполнения

#### HttpExceptionFilter (`src/common/filters/http-exception.filter.ts`)
Глобальный фильтр исключений для единообразного форматирования ошибок.

---

### Proxy к RAWG API

#### rawg-proxy.ts (`src/games/rawg-proxy.ts`)
Функция для запросов к внешнему RAWG API через прокси.

**URL прокси:**
```
https://playpulse-rawg-proxy.vercel.app/api/rawg
```

**Функция `fetchFromRawgProxy`:**
```typescript
async function fetchFromRawgProxy(
  httpService: HttpService,
  endpoint: string,
  params?: Record<string, any>
)
```

**Параметры:**
- `httpService` — NestJS HttpService
- `endpoint` — endpoint RAWG API (например, `games`, `games/123`)
- `params` — query параметры

**Особенности:**
- Автоматически удаляет пустые параметры
- Таймаут: 15 секунд
- Логирование всех запросов и ошибок
- Возвращает распарсенные данные

**Пример использования:**
```typescript
const games = await fetchFromRawgProxy(
  this.httpService,
  'games',
  { page: 1, page_size: 20, ordering: '-rating' }
);
```

---

## 🎨 Frontend (Next.js)

### Страницы и маршруты

#### Главная страница (`/app/page.tsx`)
**Компоненты:**
- Hero секция с заголовком
- Табы навигации: Популярные, Новинки, В тренде, Для вас
- Сортировка для популярных игр
- GamesGrid с играми

**Функционал:**
- Переключение между категориями игр
- Персональные рекомендации для авторизованных
- Загрузка игр через gameService

---

#### Страница игр (`/app/games/page.tsx`)
**Компоненты:**
- GamesPageContent — основной контент
- SearchInput — поиск игр
- Filters — фильтры по жанрам, платформам
- GamesGrid — сетка игр
- Pagination — пагинация

**Функционал:**
- Поиск по названию
- Фильтрация по параметрам
- Сортировка результатов
- Бесконечная прокрутка или пагинация

---

#### Страница деталей игры (`/app/games/[id]/page.tsx`)
**Компоненты:**
- GameCard — основная информация
- ScreenshotGallery — галерея скриншотов
- GameActions — кнопки действий (лайк, оценка, статус)
- StatsCharts — статистика игры
- Deals — предложения о покупке

**Функционал:**
- Полная информация об игре
- Просмотр скриншотов
- Управление действиями (лайк, рейтинг, статус)
- Поиск лучших цен

---

#### Страница свайпов (`/app/swipes/page.tsx`)
**Компоненты:**
- SwipeCard — карточка игры для свайпа
- SwipeControls — кнопки управления
- AuthPopup — попап авторизации
- Stats — статистика свайпов

**Функционал:**
- **Tinder-like интерфейс** для быстрого выбора игр
- Свайп вправо = лайк
- Свайп влево = дизлайк
- Свайп вверх = пропустить
- **Batch обработка** действий (отправка пачками)
- Prefetch следующей пачки игр
- Сохранение при закрытии вкладки (sendBeacon)

**Особенности реализации:**
```typescript
// Настройки батчинга
const BATCH_SIZE = 10;
const BATCH_FLUSH_INTERVAL = 5000; // 5 секунд
const MAX_BATCH_SIZE = 10;

// Pending actions хранятся локально
const [pendingActions, setPendingActions] = useState<PendingSwipeAction[]>([]);

// Отправка происходит:
// 1. По таймеру (каждые 5 сек)
// 2. При наборе MAX_BATCH_SIZE
// 3. При уходе со страницы (visibilitychange)
// 4. При закрытии вкладки (beforeunload + sendBeacon)
```

---

#### Страница профиля (`/app/profile/page.tsx`)
**Компоненты:**
- ProfileHeader — аватар, имя, био
- ProfileGamesGrid — игры пользователя
- ProfileGameCard — карточка игры в профиле
- ProfileSettingsModal — настройки профиля
- StatsCharts — статистика пользователя

**Функционал:**
- Просмотр своих игр (лайки, оценки, wishlist)
- Редактирование профиля
- Статистика игровой активности
- Защита маршрута через middleware

---

#### Страница авторизации (`/app/auth/page.tsx`)
**Компоненты:**
- LoginForm — форма входа
- RegisterForm — форма регистрации
- Переключение между вкладками

**Функционал:**
- Логин по логину/паролю
- Регистрация нового аккаунта
- Редирект после успешной авторизации

---

#### Страница новостей (`/app/news/page.tsx`)
**Компоненты:**
- NewsCard — карточка новости
- RssSourcesPanel — панель источников

**Функционал:**
- Агрегация новостей из RSS источников
- Фильтрация по источникам
- Группировка по категориям

---

### API Routes (Proxy)

**ВАЖНО:** Все запросы к бэкенду идут через Next.js API Routes. Это обеспечивает:
- Единую точку входа
- Возможность модификации запросов/ответов
- Кэширование на уровне proxy
- Безопасность (скрытие реального URL бэкенда)

#### Auth Proxy Routes

| Route | File | Backend Endpoint | Описание |
|-------|------|------------------|----------|
| `POST /api/auth/login` | `route.ts` | `POST /auth/login` | Логин + установка cookies |
| `POST /api/auth/register` | `route.ts` | `POST /auth/register` | Регистрация |
| `POST /api/auth/logout` | `route.ts` | `POST /auth/logout` | Logout + очистка cookies |
| `GET /api/auth/check` | `route.ts` | `GET /auth/validate` | Проверка авторизации |
| `GET /api/auth/validate` | `route.ts` | `GET /auth/validate` | Валидация токена |
| `POST /api/auth/sync` | `route.ts` | - | Синхронизация сессии |

**Пример: /api/auth/login/route.ts**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  
  if (response.ok) {
    const res = NextResponse.json(data);
    // Установка httpOnly cookies
    res.cookies.set({
      name: 'token',
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      path: '/',
    });
    return res;
  }
  
  return NextResponse.json(data, { status: response.status });
}
```

---

#### Games Proxy Routes

| Route | File | Backend Endpoint | Описание |
|-------|------|------------------|----------|
| `GET /api/games` | `route.ts` | `GET /games` | Список игр |
| `GET /api/games/:id` | `[id]/route.ts` | `GET /games/:id` | Детали игры |
| `POST /api/games/:id/like` | `[id]/like/route.ts` | `POST /games/:id/like` | Лайк |
| `DELETE /api/games/:id/like` | `[id]/like/route.ts` | `DELETE /games/:id/like` | Убрать лайк |
| `POST /api/games/:id/dislike` | `[id]/dislike/route.ts` | `POST /games/:id/dislike` | Дизлайк |
| `DELETE /api/games/:id/dislike` | `[id]/dislike/route.ts` | `DELETE /games/:id/dislike` | Убрать дизлайк |
| `POST /api/games/:id/rate` | `[id]/rate/route.ts` | `POST /games/:id/rate` | Оценка |
| `DELETE /api/games/:id/rate` | `[id]/rate/route.ts` | `DELETE /games/:id/rate` | Убрать оценку |
| `POST /api/games/:id/status` | `[id]/status/route.ts` | `POST /games/:id/status` | Статус прохождения |
| `POST /api/games/:id/purchase` | `[id]/purchase/route.ts` | `POST /games/:id/purchase` | Статус покупки |
| `POST /api/games/:id/wishlist` | `[id]/wishlist/route.ts` | `POST /games/:id/wishlist` | Добавить в wishlist |
| `DELETE /api/games/:id/wishlist` | `[id]/wishlist/route.ts` | `DELETE /games/:id/wishlist` | Убрать из wishlist |
| `GET /api/games/genres` | `genres/route.ts` | - | Список жанров |
| `GET /api/games/platforms` | `platforms/route.ts` | - | Список платформ |

**Пример: /api/games/route.ts**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  
  const backendUrl = new URL(`${BACKEND_URL}/games`);
  
  // Проброс query параметров
  searchParams.forEach((value, key) => {
    if (value !== undefined && value !== null && value !== '') {
      backendUrl.searchParams.set(key, value);
    }
  });
  
  const response = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  
  const text = await response.text();
  
  return new NextResponse(text, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

#### Users Proxy Routes

| Route | File | Backend Endpoint | Описание |
|-------|------|------------------|----------|
| `GET /api/users/me` | `route.ts` | `GET /users/me` | Мой профиль |
| `PUT /api/users/me` | `route.ts` | `PUT /users/me` | Обновить профиль |
| `GET /api/users/me/profile` | `profile/route.ts` | - | Данные профиля |
| `GET /api/users/me/games` | `games/route.ts` | `GET /users/me/games` | Мои игры |

---

#### Recommendations Proxy Routes

| Route | File | Backend Endpoint | Описание |
|-------|------|------------------|----------|
| `GET /api/recommendations/swipes` | `swipes/route.ts` | `GET /recommendations/swipes` | Игры для свайпов |
| `POST /api/recommendations/swipe-action` | `swipe-action/route.ts` | - | Одиночное действие |
| `POST /api/recommendations/swipe-action/batch` | `batch/route.ts` | `POST /recommendations/swipe-action/batch` | Пачка действий |
| `GET /api/recommendations/similar/:gameId` | `similar/[gameId]/route.ts` | `GET /recommendations/similar/:gameId` | Похожие игры |
| `GET /api/recommendations/popular` | `popular/route.ts` | `GET /recommendations/popular` | Популярные |

---

#### News Proxy Routes

| Route | File | Описание |
|-------|------|----------|
| `GET /api/news/rss` | `route.ts` | Получить RSS новости |
| `POST /api/news/rss` | `route.ts` | Получить новости по источникам |

**Источники RSS:**
- StopGame.ru
- Cubiq.ru
- GoHa.Ru
- iGuides.ru
- DTF.ru

**Особенности:**
- Параллельный фетчинг всех источников
- Fallback на CORS прокси при неудаче
- Парсинг через @xmldom/xmldom
- Кэширование на 5 минут

---

#### Другие Proxy Routes

| Route | Описание |
|-------|----------|
| `GET /api/deals` | Поиск предложений о покупке игр |
| `POST /api/crop-image` | Обрезка изображений |
| `GET /api/preferences/game-actions` | Действия пользователя |
| `GET /api/test` | Тестовый endpoint |

---

### Компоненты

#### UI Компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| `GameCard` | `components/GameCard/GameCard.tsx` | Карточка игры в сетке |
| `GamesGrid` | `components/GamesGrid/GamesGrid.tsx` | Сетка игр (grid layout) |
| `SwipeCard` | `components/SwipeCard/SwipeCard.tsx` | Карточка для свайпов |
| `SwipeControls` | `components/SwipeControls/SwipeControls.tsx` | Кнопки управления свайпами |
| `GameActions` | `components/GameActions/GameActions.tsx` | Кнопки действий (лайк, оценка) |
| `SearchInput` | `components/SearchInput/SearchInput.tsx` | Поле поиска с debounce |
| `StarRating` | `components/StarRating/StarRaing.tsx` | Звёздный рейтинг (1-10) |
| `ScreenshotGallery` | `components/ScreenshotGallery/ScreenshotGallery.tsx` | Галерея скриншотов |
| `StatsCharts` | `components/StatsCharts/StatsCharts.tsx` | Графики статистики (Recharts) |
| `NewsCard` | `components/NewsCard/NewsCard.tsx` | Карточка новости |
| `RssSourcesPanel` | `components/RssSourcesPanel/RssSourcesPanel.tsx` | Панель выбора RSS источников |
| `NavigationBlock` | `components/NavigationBlock/NavigationBlock.tsx` | Навигационный блок |
| `LoginForm` | `components/LoginForm/LoginForm.tsx` | Форма входа |
| `RegisterForm` | `components/RegisterForm/RegisterForm.tsx` | Форма регистрации |
| `AuthPopup` | `components/AuthPopup/AuthPopup.tsx` | Попап авторизации |
| `AuthGuard` | `components/AuthGuard/AuthGuard.tsx` | HOC для защиты компонентов |

#### Profile Компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| `ProfileHeader` | `components/profile/ProfileHeader.tsx` | Шапка профиля |
| `ProfileGameCard` | `components/profile/ProfileGameCard.tsx` | Карточка игры в профиле |
| `ProfileGamesGrid` | `components/profile/ProfileGamesGrid.tsx` | Сетка игр пользователя |
| `ProfileSettingsModal` | `components/profile/ProfileSettingsModal.tsx` | Модальное окно настроек |

---

### Contexts и Hooks

#### AuthContext (`contexts/AuthContext.tsx`)
Контекст аутентификации.

**State:**
```typescript
{
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

**Methods:**
```typescript
login(login: string, password: string): Promise<boolean>
register(login: string, password: string): Promise<boolean>
logout(): Promise<void>
updateUser(userData: Partial<User>): void
updateProfile(profileData: Partial<UserProfile>): void
refreshProfile(): Promise<void>
```

**Использование:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  // ...
}
```

---

#### GameActionsContext (`contexts/GameActionsContexts.tsx`)
Контекст для управления действиями с играми.

---

#### useMediaActions Hook (`hooks/useMediaActions.ts`)
Хук для работы с медиа-действиями.

---

### Services

#### gameService (`services/gameService.ts`)
Основной сервис для работы с играми.

**Функции:**
```typescript
// Получение списка игр
gameService(
  filters: GameFilters,
  page: number,
  pageSize: number,
  sortBy: GameSortOption
): Promise<GamesResponse>

// Детали игры
getGameById(id: number): Promise<GameDetails>

// Жанры
getGenres(): Promise<Array<{ id: number; name: string }>>

// Платформы
getPlatforms(): Promise<Array<{ id: number; name: string }>>

// Предложения о покупке
getDealsWithAverage(name: string): Promise<DealsWithAverage>

// Поиск
searchGames(query: string, page: number, pageSize: number): Promise<GamesResponse>

// Популярные
getPopularGames(page: number, pageSize: number): Promise<GamesResponse>

// Новинки
getNewGames(page: number, pageSize: number): Promise<GamesResponse>

// Proxy изображений
proxifyImage(imageUrl?: string): string
```

**GameFilters:**
```typescript
{
  genres?: string;
  platforms?: string;
  tags?: number[];
  dates?: string;
  developers?: number[];
  publishers?: number[];
  search?: string;
}
```

**GameSortOption:**
```typescript
type GameSortOption = 
  | 'name' | '-name'
  | 'released' | '-released'
  | 'added' | '-added'
  | 'rating' | '-rating'
  | 'metacritic' | '-metacritic'
  | 'for-me';
```

**Image Proxy:**
```typescript
const RAWG_IMAGE_PROXY = 'https://playpulse-rawg-proxy.vercel.app/api/image?url=';

export const proxifyImage = (imageUrl?: string): string => {
  if (!imageUrl) return '/placeholder-game.jpg';
  if (imageUrl.includes('/api/image?url=')) return imageUrl;
  return RAWG_IMAGE_PROXY + encodeURIComponent(imageUrl);
};
```

---

#### scrollService (`services/scrollService.ts`)
Утилиты для работы со скроллом.

---

### Middleware

#### Next.js Middleware (`middleware.ts`)
Middleware для защиты маршрутов.

**Конфигурация:**
```typescript
export const config = {
  matcher: ['/profile/:path*'],
};
```

**Логика:**
- Проверяет наличие токена в cookies
- Защищает маршрут `/profile`
- Редиректит на `/auth` если нет токена

---

## 💾 База данных (Supabase)

### Таблицы

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT
);
```

#### user_game_actions
```sql
CREATE TABLE user_game_actions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  game_id INTEGER NOT NULL,
  game_name VARCHAR(255),
  game_image TEXT,
  action_type VARCHAR(50) NOT NULL, -- 'like', 'dislike', 'wishlist', 'rate'
  rating INTEGER,
  completion_status VARCHAR(50), -- 'not_played', 'playing', 'completed', 'dropped'
  purchase_status VARCHAR(50), -- 'owned', 'not_owned', 'want_to_buy'
  genres JSONB,
  tags JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, game_id, action_type)
);
```

#### games (кэш)
```sql
CREATE TABLE games (
  rawg_id INTEGER PRIMARY KEY,
  name VARCHAR(255),
  slug VARCHAR(255),
  released DATE,
  background_image TEXT,
  rating DECIMAL,
  metacritic INTEGER,
  genres JSONB,
  tags JSONB,
  screenshots JSONB,
  cached_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Аутентификация и авторизация

### Flow аутентификации

1. **Регистрация:**
   ```
   POST /api/auth/register
   → Backend: хеширование пароля (bcrypt)
   → Backend: создание пользователя в Supabase
   → Возврат JWT токена
   → Frontend: сохранение в cookies + localStorage
   ```

2. **Логин:**
   ```
   POST /api/auth/login
   → Backend: проверка логина/пароля
   → Backend: генерация JWT токена
   → Возврат токена + данных пользователя
   → Frontend: сохранение в cookies + localStorage
   ```

3. **Проверка авторизации:**
   ```
   GET /api/auth/check
   → Проверка токена в cookies
   → Валидация через Backend
   → Возврат данных пользователя
   ```

4. **Доступ к защищённым роутам:**
   ```
   Любой запрос к /api/games/:id/like
   → Frontend: добавление Authorization: Bearer <token>
   → Backend: проверка через JwtAuthGuard
   → Извлечение userId из токена
   ```

### JWT Token

**Payload:**
```json
{
  "sub": 1,           // user id
  "login": "username",
  "iat": 1234567890,  // issued at
  "exp": 1235172690   // expiration (7 days)
}
```

**Заголовок:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 Система рекомендаций

### Алгоритмы

#### 1. Свайпы (Random High-Rated)
- Случайные игры с рейтингом > 7
- Наличие background_image
- Исключение уже просмотренных

#### 2. Похожие игры
- Анализ жанров и тегов
- Поиск игр с похожими характеристиками
- Сортировка по релевантности

#### 3. Популярные
- Сортировка по количеству добавлений (`added`)
- Учёт рейтинга

#### 4. Персональные (для будущих версий)
- Анализ лайков пользователя
- Анализ оценок
- Подбор по жанрам и тегам

---

## 🚀 Кэширование

### Redis Cache

**Конфигурация:**
```typescript
CacheModule.registerAsync({
  isGlobal: true,
  useFactory: async () => ({
    store: await redisStore({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
  }),
})
```

**Кэшируемые endpoints:**

| Endpoint | TTL | Описание |
|----------|-----|----------|
| `GET /games` | 300 сек (5 мин) | Список игр |
| `GET /games/:id` | 3600 сек (1 час) | Детали игры |
| `GET /preferences/game-actions` | 60 сек | Действия пользователя |

**Decorators:**
```typescript
@UseInterceptors(CacheInterceptor)
@CacheTTL(300)
@CacheKey('custom-key')
```

---

## ▶️ Запуск проекта

### Требования
- Node.js >= 18
- Redis (для кэширования)
- Supabase аккаунт (или локальный PostgreSQL)

### Установка зависимостей

```bash
# Root
npm install

# Backend
cd apps/backend
npm install

# Frontend
cd apps/frontend
npm install
```

### Переменные окружения

#### Backend (.env)
```env
# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# RAWG (опционально, используется proxy)
RAWG_API_KEY=your-rawg-api-key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_URL=http://localhost:3001
```

### Запуск

```bash
# Terminal 1: Backend
cd apps/backend
npm run start:dev

# Terminal 2: Frontend
cd apps/frontend
npm run dev

# Terminal 3: Redis (если локально)
redis-server
```

### Docker (опционально)

```bash
# Backend
docker build -t playpulse-backend ./apps/backend
docker run -p 3001:3001 --env-file apps/backend/.env playpulse-backend

# Frontend
docker build -t playpulse-frontend ./apps/frontend
docker run -p 3000:3000 --env-file apps/frontend/.env.local playpulse-frontend
```

---

## 📊 Swagger документация

Backend включает Swagger UI для API документации.

**URL:** `http://localhost:3001/api`

**Документированные endpoints:**
- Все контроллеры с `@ApiTags`
- Все методы с `@ApiOperation`
- DTO с `@ApiProperty`

---

## 🧪 Тестирование

### Backend тесты

```bash
cd apps/backend

# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Coverage
npm run test:cov
```

### Frontend тесты

```bash
cd apps/frontend

# Lint
npm run lint

# Build
npm run build
```

---

## 📝 Лицензия

UNLICENSED

---

## 👥 Команда

Разработано командой PlayPulse.

---

## 📞 Контакты

- GitHub: [repository]
- Email: [email]

---

*Документация актуальна на момент последнего коммита. Последнее обновление: 2024*
