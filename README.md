# PlayPulse — Платформа для открытия игр

**PlayPulse** — это современное веб-приложение для каталогизации, отслеживания и открытия новых игр с использованием механики свайпов (Tinder-like), интеграцией с RAWG API и персональным кабинетом пользователя.

---

## 📋 Оглавление

1. [Архитектура проекта](#архитектура-проекта)
2. [Технологический стек](#технологический-стек)
3. [Структура проекта](#структура-проекта)
4. [Backend (NestJS)](#backend-nestjs)
   - [Модули](#модули-backend)
   - [API Endpoints](#api-endpoints-backend)
   - [RAWG Proxy](#rawg-proxy)
   - [Система действий пользователя](#система-действий-пользователя)
5. [Frontend (Next.js)](#frontend-nextjs)
   - [Страницы](#страницы)
   - [API Routes Proxy Layer](#api-routes-proxy-layer)
   - [Компоненты](#компоненты)
   - [Contexts & Hooks](#contexts--hooks)
6. [База данных (Supabase)](#база-данных-supabase)
7. [Аутентификация и JWT](#аутентификация-и-jwt)
8. [Система свайпов](#система-свайпов)
9. [Кэширование (Redis)](#кэширование-redis)
10. [Запуск проекта](#запуск-проекта)
11. [Переменные окружения](#переменные-окружения)

---

## 🏗 Архитектура проекта

### Общая схема взаимодействия

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │ ──▶ │  Next.js Frontend    │ ──▶ │ NestJS       │ ──▶ │  RAWG API   │
│   (Client)  │     │  (Port 3000)         │     │ Backend      │     │  (External) │
└─────────────┘     │                      │     │ (Port 3001)  │     └─────────────┘
                    │  ┌────────────────┐  │     └──────┬───────┘
                    │  │ API Routes     │  │            │
                    │  │ (/api/*)       │  │            ▼
                    │  │ PROXY LAYER    │◀──────────────┘
                    │  └────────────────┘  │     ┌──────────────┐
                    │                      │     │ Supabase DB  │
                    │  ┌────────────────┐  │     │ + Redis      │
                    │  │ React Components│ │     └──────────────┘
                    │  └────────────────┘  │
                    └──────────────────────┘
```

### 🔑 Ключевая особенность: Proxy-архитектура

**Все запросы НЕ идут напрямую к API.** Вместо этого используется двухуровневая proxy-система:

1. **Frontend Proxy Layer** (Next.js API Routes): `/api/*` на фронтенде проксирует запросы на backend
2. **Backend Proxy** (RAWG Proxy): Backend обращается к внешнему RAWG API через отдельный proxy-сервис `https://playpulse-rawg-proxy.vercel.app/api/rawg`

**Преимущества:**
- ✅ Сокрытие API ключей от клиента
- ✅ Единая точка входа для всех запросов
- ✅ Возможность кэширования на разных уровнях
- ✅ Централизованная обработка ошибок
- ✅ Контроль доступа и валидация токенов

---

## 🛠 Технологический стек

### Backend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **NestJS** | ^10.x | Основной фреймворк |
| **TypeScript** | ^5.x | Язык разработки |
| **Supabase** | Latest | База данных PostgreSQL |
| **Passport.js** | Latest | Аутентификация |
| **JWT** | Latest | Токены доступа |
| **bcrypt** | Latest | Хеширование паролей |
| **cache-manager** | Latest | Кэширование |
| **cache-manager-redis-yet** | Latest | Redis хранилище |
| **@nestjs/axios** | Latest | HTTP запросы к RAWG |
| **RxJS** | Latest | Reactive extensions |
| **Swagger** | Built-in | API документация |

### Frontend
| Технология | Версия | Назначение |
|------------|--------|------------|
| **Next.js** | 15.x | React фреймворк |
| **React** | 19.x | UI библиотека |
| **TypeScript** | ^5.x | Язык разработки |
| **CSS Modules** | Native | Стилизация компонентов |
| **Context API** | Native | Управление состоянием |

### Инфраструктура
| Сервис | Назначение |
|--------|------------|
| **Supabase** | PostgreSQL база данных + Realtime |
| **Redis** | Кэширование ответов API |
| **Vercel** | Хостинг RAWG Proxy |

---

## 📁 Структура проекта

```
/workspace
├── apps/
│   ├── backend/                 # NestJS приложение (Port 3001)
│   │   ├── src/
│   │   │   ├── auth/            # Модуль аутентификации
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   └── register.dto.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guardl.ts
│   │   │   │   │   └── optional-jwt.ts
│   │   │   │   └── strategies/
│   │   │   │       └── jwt.strategy.ts
│   │   │   │
│   │   │   ├── games/           # Модуль игр
│   │   │   │   ├── games.controller.ts
│   │   │   │   ├── games.service.ts
│   │   │   │   ├── games.module.ts
│   │   │   │   ├── rawg-proxy.ts          # ⭐ Proxy к RAWG API
│   │   │   │   ├── entities/
│   │   │   │   │   └── game.entity.ts
│   │   │   │   └── dto/
│   │   │   │       ├── game-meta.dto.ts
│   │   │   │       ├── rate-game.dto.ts
│   │   │   │       ├── update-game-status.dto.ts
│   │   │   │       └── get-games.dto.ts
│   │   │   │
│   │   │   ├── swipes/ # Модуль рекомендаций и свайпов
│   │   │   │   ├── swipes.controller.ts
│   │   │   │   ├── swipes.module.ts
│   │   │   │   ├── swipes.service.ts   # Логика свайпов
│   │   │   │   ├── preferences.controller.ts
│   │   │   │   ├── preferences.module.ts
│   │   │   │   └── preferences.service.ts      # Действия пользователя
│   │   │   │
│   │   │   ├── users/           # Модуль пользователей
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── user-profile.entity.ts
│   │   │   │   └── dto/
│   │   │   │       ├── update-user-dto.ts
│   │   │   │       └── update-profile.dto.ts
│   │   │   │
│   │   │   ├── supabase/        # Глобальный модуль Supabase
│   │   │   │   ├── supabase.module.ts
│   │   │   │   ├── supabase.service.ts
│   │   │   │   └── supabase.constants.ts
│   │   │   │
│   │   │   ├── common/          # Общие утилиты
│   │   │   │   └── filters/
│   │   │   │       ├── http-exception.filter.ts
│   │   │   │       └── middleware/
│   │   │   │           └── request-logger.middleware.ts
│   │   │   │
│   │   │   ├── app.module.ts
│   │   │   ├── app.controller.ts
│   │   │   ├── app.service.ts
│   │   │   └── main.ts
│   │   │
│   │   ├── test/
│   │   └── jest.config.ts
│   │
│   └── frontend/                # Next.js приложение (Port 3000)
│       ├── src/
│       │   ├── app/             # App Router
│       │   │   ├── api/         # ⭐ PROXY LAYER — все запросы через это!
│       │   │   │   ├── auth/
│       │   │   │   │   ├── check/route.ts
│       │   │   │   │   ├── login/route.ts
│       │   │   │   │   ├── logout/route.ts
│       │   │   │   │   ├── register/route.ts
│       │   │   │   │   ├── sync/route.ts
│       │   │   │   │   └── validate/route.ts
│       │   │   │   │
│       │   │   │   ├── games/
│       │   │   │   │   ├── route.ts
│       │   │   │   │   ├── [id]/route.ts
│       │   │   │   │   ├── [id]/like/route.ts
│       │   │   │   │   ├── [id]/dislike/route.ts
│       │   │   │   │   ├── [id]/rate/route.ts
│       │   │   │   │   ├── [id]/wishlist/route.ts
│       │   │   │   │   ├── [id]/status/route.ts
│       │   │   │   │   ├── [id]/purchase/route.ts
│       │   │   │   │   ├── genres/route.ts
│       │   │   │   │   └── platforms/route.ts
│       │   │   │   │
│       │   │   │   ├── swipes/
│       │   │   │   │   ├── swipes/route.ts
│       │   │   │   │   ├── swipe-action/route.ts
│       │   │   │   │   ├── swipe-action/batch/route.ts
│       │   │   │   │   ├── popular/route.ts
│       │   │   │   │   └── similar/[gameId]/route.ts
│       │   │   │   │
│       │   │   │   ├── users/
│       │   │   │   │   ├── me/route.ts
│       │   │   │   │   ├── me/games/route.ts
│       │   │   │   │   └── me/profile/route.ts
│       │   │   │   │
│       │   │   │   ├── preferences/
│       │   │   │   │   └── game-actions/route.ts
│       │   │   │   │
│       │   │   │   ├── news/
│       │   │   │   │   └── rss/route.ts
│       │   │   │   │
│       │   │   │   ├── deals/route.ts
│       │   │   │   ├── crop-image/route.ts
│       │   │   │   └── test/route.ts
│       │   │   │
│       │   │   ├── auth/page.tsx           # Страница авторизации
│       │   │   ├── swipes/page.tsx         # ⭐ Страница свайпов
│       │   │   ├── profile/page.tsx        # Профиль пользователя
│       │   │   ├── games/page.tsx          # Каталог игр
│       │   │   ├── games/[id]/page.tsx     # Детали игры
│       │   │   ├── news/page.tsx           # Новости (RSS)
│       │   │   ├── page.tsx                # Главная страница
│       │   │   ├── layout.tsx              # Корневой layout
│       │   │   ├── ClientLayout.tsx        # Клиентский layout
│       │   │   └── not-found.tsx           # 404 страница
│       │   │
│       │   ├── components/                 # UI компоненты
│       │   │   ├── GameCard/
│       │   │   │   ├── GameCard.tsx
│       │   │   │   └── GameCard.module.css
│       │   │   ├── GamesGrid/
│       │   │   ├── SwipeCard/
│       │   │   ├── SwipeControls/
│       │   │   ├── GameActions/
│       │   │   ├── SearchInput/
│       │   │   ├── StarRating/
│       │   │   ├── ScreenshotGallery/
│       │   │   ├── NewsCard/
│       │   │   ├── StatsCharts/
│       │   │   ├── NavigationBlock/
│       │   │   ├── RssSourcesPanel/
│       │   │   ├── AuthGuard/
│       │   │   ├── AuthPopup/
│       │   │   ├── LoginForm/
│       │   │   ├── RegisterForm/
│       │   │   └── profile/
│       │   │       ├── ProfileHeader.tsx
│       │   │       ├── ProfileGamesGrid.tsx
│       │   │       ├── ProfileGameCard.tsx
│       │   │       └── ProfileSettingsModal.tsx
│       │   │
│       │   ├── contexts/                   # React Contexts
│       │   │   ├── AuthContext.tsx         # Аутентификация
│       │   │   └── GameActionsContexts.tsx # Действия с играми
│       │   │
│       │   ├── hooks/                      # Custom hooks
│       │   │   └── useMediaActions.ts
│       │   │
│       │   ├── services/                   # Сервисы
│       │   │   ├── gameService.ts
│       │   │   └── scrollService.ts
│       │   │
│       │   └── lib/                        # Утилиты
│       │       ├── supabase.ts
│       │       └── platforms.ts
│       │
│       ├── middleware.ts                   # Next.js middleware
│       └── next.config.ts
│
└── README.md                               # Эта документация
```

---

## 🔧 Backend (NestJS)

### Модули Backend

#### 1. **AuthModule** (`src/auth/`)
Отвечает за регистрацию, вход и валидацию JWT токенов.

**Файлы:**
- `auth.controller.ts` — контроллер с endpoints
- `auth.service.ts` — бизнес-логика аутентификации
- `jwt.strategy.ts` — стратегия Passport для JWT
- `guards/jwt-auth.guardl.ts` — Guard для защиты роутов
- `guards/optional-jwt.ts` — Опциональная аутентификация

**DTO:**
- `RegisterDto` — `{ login: string, password: string }`
- `LoginDto` — `{ login: string, password: string }`

#### 2. **GamesModule** (`src/games/`)
Управление играми, получение данных из RAWG API.

**Файлы:**
- `games.controller.ts` — CRUD операции с играми
- `games.service.ts` — логика получения и фильтрации игр
- `rawg-proxy.ts` — ⭐ **Proxy функция для запросов к RAWG**
- `game.entity.ts` — интерфейс игры

**DTO:**
- `RateGameDto` — `{ rating: number, gameName, gameImage, genres, tags }`
- `UpdateGameStatusDto` — `{ status: 'not_played'|'playing'|'completed'|'dropped', ...meta }`
- `UpdatePurchaseDto` — `{ purchase: 'owned'|'not_owned'|'want_to_buy', ...meta }`
- `GameMetaDto` — `{ gameName, gameImage, genres, tags }`

#### 3. **swipesModule** (`src/swipes/`)
Система свайпов и действий пользователя.

**Важно:** В текущей версии **НЕТ персонализированных рекомендаций или AI алгоритмов**. 
Модуль предоставляет:
- Случайные популярные игры для свайпов
- Исключение уже просмотренных игр
- Похожие игры на основе жанров (simple matching)

**Файлы:**
- `swipes.controller.ts` — endpoints для свайпов
- `swipes.service.ts` — логика получения игр для свайпов
- `preferences.controller.ts` — управление действиями
- `preferences.service.ts` — обработка like/dislike/rating/status

#### 4. **UsersModule** (`src/users/`)
Профили пользователей и статистика.

**Файлы:**
- `users.controller.ts` — endpoints профиля
- `users.service.ts` — работа с пользователями
- `user.entity.ts` — сущность пользователя
- `user-profile.entity.ts` — расширенный профиль

#### 5. **SupabaseModule** (`src/supabase/`)
Глобальный модуль для подключения к Supabase.

**Файлы:**
- `supabase.module.ts` — глобальный модуль
- `supabase.service.ts` — сервис для работы с БД
- `supabase.constants.ts` — константы подключения

#### 6. **CommonModule** (`src/common/`)
Общие утилиты.

**Файлы:**
- `filters/http-exception.filter.ts` — глобальный фильтр исключений
- `middleware/request-logger.middleware.ts` — логгирование всех запросов

---

### 📡 API Endpoints Backend

#### Auth Controller (`/auth`)

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| POST | `/auth/register` | Регистрация нового пользователя | ❌ |
| POST | `/auth/login` | Вход в систему | ❌ |
| GET | `/auth/validate` | Проверка валидности токена | ✅ |
| POST | `/auth/logout` | Выход из системы | ❌ |

**Пример ответа `/auth/login`:**
```json
{
  "user": {
    "id": 1,
    "login": "username",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### Games Controller (`/games`)

| Метод | Endpoint | Описание | Auth | Cache |
|-------|----------|----------|------|-------|
| GET | `/games` | Список игр с фильтрацией | ❌ | 300s |
| GET | `/games/:id` | Детали игры | ❌ | 3600s |
| POST | `/games/:id/like` | Поставить лайк | ✅ | - |
| DELETE | `/games/:id/like` | Убрать лайк | ✅ | - |
| POST | `/games/:id/dislike` | Дизлайк | ✅ | - |
| DELETE | `/games/:id/dislike` | Убрать дизлайк | ✅ | - |
| POST | `/games/:id/wishlist` | Добавить в wishlist | ✅ | - |
| DELETE | `/games/:id/wishlist` | Удалить из wishlist | ✅ | - |
| POST | `/games/:id/rate` | Оценка (1-10) | ✅ | - |
| DELETE | `/games/:id/rate` | Удалить оценку | ✅ | - |
| GET | `/games/:id/my-rating` | Моя оценка | ✅ | - |
| POST | `/games/:id/status` | Статус прохождения | ✅ | - |
| POST | `/games/:id/purchase` | Статус покупки | ✅ | - |

**Параметры GET `/games`:**
- `page` (default: 1)
- `pageSize` (default: 20)
- `search` — поисковый запрос
- `ordering` — сортировка (`-rating`, `-added`, `-released`)
- `genres` — ID жанров через запятую
- `platforms` — ID платформ
- `tags` — ID тегов
- `dates` — диапазон дат выхода
- `developers` — ID разработчиков
- `publishers` — ID издателей

**Пример ответа GET `/games`:**
```json
{
  "count": 500000,
  "next": "https://api.rawg.io/games?page=2",
  "previous": null,
  "results": [
    {
      "id": 12345,
      "slug": "the-witcher-3",
      "name": "The Witcher 3: Wild Hunt",
      "released": "2015-05-19",
      "background_image": "https://...",
      "rating": 4.9,
      "metacritic": 93,
      "genres": [{ "id": 4, "name": "Action" }],
      "tags": [...],
      "added": 15000
    }
  ]
}
```

---

#### swipes Controller (`/swipes`)

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/swipes/swipes` | Игры для свайпов | ✅ |
| POST | `/swipes/swipe-action/batch` | Пакетная отправка свайпов | ✅ |
| GET | `/swipes/popular` | Популярные игры | ✅ |
| GET | `/swipes/similar/:gameId` | Похожие игры | ✅ |

**Логика свайпов (`GET /swipes/swipes`):**
1. Получает ID игр, с которыми пользователь уже взаимодействовал
2. Делает **3 параллельных запроса** к случайным страницам (1-10) RAWG API
3. Фильтрует игры по критериям:
   - `rating >= 4.0`
   - `background_image` существует
   - Не входит в список просмотренных
4. Если не хватило — делает ещё 2 запроса (страницы 11-15)
5. Fallback: любые популярные игры с картинкой

**Пример ответа:**
```json
{
  "success": true,
  "games": [
    {
      "id": 12345,
      "name": "Game Name",
      "background_image": "https://...",
      "rating": 4.5,
      "genres": [...],
      "tags": [...]
    }
  ],
  "hasMore": true
}
```

**POST `/swipes/swipe-action/batch`:**
```json
{
  "actions": [
    {
      "gameId": 12345,
      "gameName": "Game Name",
      "gameImage": "https://...",
      "genres": [{"id": "1", "name": "Action"}],
      "tags": [...],
      "action": "like"
    }
  ]
}
```

---

#### Users Controller (`/users`)

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| GET | `/users/me` | Мой профиль | ✅ |
| PUT | `/users/me` | Обновить пользователя | ✅ |
| PUT | `/users/me/profile` | Обновить профиль | ✅ |
| GET | `/users/me/games` | Мои игры | ✅ |
| GET | `/users/:id` | Публичный профиль | ❌ |

---

### 🔌 RAWG Proxy

**Файл:** `apps/backend/src/games/rawg-proxy.ts`

Backend **НЕ обращается напрямую** к RAWG API. Вместо этого используется внешний proxy:

```typescript
const RAWG_PROXY_URL = 'https://playpulse-rawg-proxy.vercel.app/api/rawg';

export async function fetchFromRawgProxy(
  httpService: HttpService,
  endpoint: string,
  params?: Record<string, any>
) {
  const url = `${RAWG_PROXY_URL}/${endpoint}?${query.toString()}`;
  const response = await firstValueFrom(httpService.get(url));
  return response.data;
}
```

**Причины использования proxy:**
- ✅ RAWG API требует API key — он хранится на Vercel, а не в коде
- ✅ Rate limiting обрабатывается на стороне proxy
- ✅ Возможность кэширования на уровне proxy
- ✅ Защита от CORS проблем

---

### 💾 Система действий пользователя

Все действия пользователя сохраняются в таблице `user_game_actions` через `PreferencesService`.

**Типы действий:**
- `like` — лайк игре
- `dislike` — дизлайк
- `wishlist` — добавить в желаемое
- `rate` — оценка (1-10)
- `status_change` — статус прохождения
- `purchase_change` — статус покупки

**Upsert логика:** Используется `upsert` с конфликтом по `(user_id, game_id, action_type)`, что позволяет обновлять существующие записи.

**Пример записи:**
```json
{
  "user_id": 1,
  "game_id": 12345,
  "game_name": "The Witcher 3",
  "game_image": "https://...",
  "action_type": "like",
  "rating": null,
  "genres": [{"id": "4", "name": "Action"}],
  "tags": [...],
  "completion_status": "not_played",
  "purchase_status": "not_owned"
}
```

---

## 🎨 Frontend (Next.js)

### 📄 Страницы

#### 1. **Главная страница** (`/app/page.tsx`)
- Приветственный экран
- Навигация к основным разделам
- Статистика платформы

#### 2. **Страница свайпов** (`/app/swipes/page.tsx`) ⭐
**Ключевые особенности:**
- Tinder-like интерфейс для открытия игр
- Загрузка игр батчами по 10 штук
- **Batch-отправка действий** — свайпы накапливаются и отправляются пачкой
- Prefetch следующей пачки при приближении к концу
- Отправка через `sendBeacon` при закрытии вкладки
- Таймаут 8 секунд на загрузку
- Исключение уже просмотренных игр

**Настройки батчинга:**
```typescript
const BATCH_SIZE = 10;
const BATCH_FLUSH_INTERVAL = 5000; // 5 секунд
const MAX_BATCH_SIZE = 10;
const PREFETCH_THRESHOLD = 5;
```

**Жесты:**
- → Свайп вправо: **Like**
- ← Свайп влево: **Dislike**
- ↑ Свайп вверх: **Пропустить**

#### 3. **Каталог игр** (`/app/games/page.tsx`)
- Сетка игр с пагинацией
- Поиск по названию
- Фильтрация по жанрам, платформам, тегам
- Сортировка по рейтингу, дате, популярности

#### 4. **Детали игры** (`/app/games/[id]/page.tsx`)
- Полная информация об игре
- Скриншоты (галерея)
- Трейлеры
- Жанры, теги, платформы
- Кнопки действий (like, dislike, wishlist, rate, status, purchase)
- Блок похожих игр

#### 5. **Профиль пользователя** (`/app/profile/page.tsx`)
- Информация о пользователе
- Статистика (средний рейтинг, количество игр)
- Вкладки:
  - Любимые игры
  - Играю сейчас
  - Завершённые
  - Брошенные
  - Wishlist
  - Оценённые
- Настройки профиля (аватар, био, имя)

#### 6. **Авторизация** (`/app/auth/page.tsx`)
- Формы входа и регистрации
- Переключение между формами

#### 7. **Новости** (`/app/news/page.tsx`)
- RSS лента игровых новостей
- Панель источников (RssSourcesPanel)

---

### 🌐 API Routes Proxy Layer

**Это критически важная часть архитектуры!**

Все запросы от клиента идут **НЕ напрямую** на backend, а через Next.js API Routes.

#### Структура proxy маршрутов:

##### Auth Proxy
| Frontend Route | Backend Target | Описание |
|----------------|----------------|----------|
| `POST /api/auth/login` | `POST /auth/login` | Вход |
| `POST /api/auth/register` | `POST /auth/register` | Регистрация |
| `POST /api/auth/logout` | `POST /auth/logout` | Выход |
| `GET /api/auth/check` | - | Проверка сессии |
| `GET /api/auth/validate` | `GET /auth/validate` | Валидация токена |
| `POST /api/auth/sync` | - | Синхронизация состояния |

##### Games Proxy
| Frontend Route | Backend Target | Описание |
|----------------|----------------|----------|
| `GET /api/games` | `GET /games` | Список игр |
| `GET /api/games/:id` | `GET /games/:id` | Детали игры |
| `POST /api/games/:id/like` | `POST /games/:id/like` | Лайк |
| `POST /api/games/:id/dislike` | `POST /games/:id/dislike` | Дизлайк |
| `POST /api/games/:id/rate` | `POST /games/:id/rate` | Оценка |
| `POST /api/games/:id/wishlist` | `POST /games/:id/wishlist` | Wishlist |
| `POST /api/games/:id/status` | `POST /games/:id/status` | Статус |
| `POST /api/games/:id/purchase` | `POST /games/:id/purchase` | Покупка |
| `GET /api/games/genres` | - | Список жанров |
| `GET /api/games/platforms` | - | Список платформ |

##### swipes Proxy
| Frontend Route | Backend Target | Описание |
|----------------|----------------|----------|
| `GET /api/swipes/swipes` | `GET /swipes/swipes` | Свайпы |
| `POST /api/swipes/swipe-action` | `POST /swipes/swipe-action` | Одиночное действие |
| `POST /api/swipes/swipe-action/batch` | `POST /swipes/swipe-action/batch` | Пакет |
| `GET /api/swipes/popular` | `GET /swipes/popular` | Популярное |
| `GET /api/swipes/similar/:id` | `GET /swipes/similar/:id` | Похожее |

##### Users Proxy
| Frontend Route | Backend Target | Описание |
|----------------|----------------|----------|
| `GET /api/users/me` | `GET /users/me` | Мой профиль |
| `PUT /api/users/me` | `PUT /users/me` | Обновить |
| `GET /api/users/me/games` | `GET /users/me/games` | Мои игры |
| `GET /api/users/me/profile` | - | Профиль данные |

##### Preferences Proxy
| Frontend Route | Backend Target | Описание |
|----------------|----------------|----------|
| `GET /api/preferences/game-actions` | - | Все действия пользователя |

##### Другие Proxy
| Frontend Route | Описание |
|----------------|----------|
| `GET /api/news/rss` | RSS новости (парсинг на сервере) |
| `GET /api/deals` | Скидки на игры |
| `POST /api/crop-image` | Обрезка аватара |
| `GET /api/test` | Тестовый endpoint |

---

#### Пример реализации proxy (`/api/games/route.ts`):

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const backendUrl = new URL(`${BACKEND_URL}/games`);
  
  // Пробрасываем все параметры на backend
  searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const response = await fetch(backendUrl.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Преимущества такой архитектуры:**
1. **Безопасность**: Токен хранится в cookies, не передаётся явно в клиентском коде
2. **CORS**: Нет проблем с cross-origin запросами
3. **Кэширование**: Можно кэшировать на уровне Next.js
4. **Трансформация**: Можно модифицировать ответы перед отправкой клиенту
5. **Rate Limiting**: Защита backend от прямых запросов

---

### 🧩 Компоненты

#### Основные компоненты (19 шт.)

| Компонент | Путь | Описание |
|-----------|------|----------|
| `GameCard` | `components/GameCard/` | Карточка игры в сетке |
| `GamesGrid` | `components/GamesGrid/` | Сетка игр с пагинацией |
| `SwipeCard` | `components/SwipeCard/` | Карта для свайпа (полный экран) |
| `SwipeControls` | `components/SwipeControls/` | Кнопки управления свайпами |
| `GameActions` | `components/GameActions/` | Кнопки действий (like, rate, etc.) |
| `SearchInput` | `components/SearchInput/` | Поле поиска с debounce |
| `StarRating` | `components/StarRating/` | Интерактивный рейтинг (звёзды) |
| `ScreenshotGallery` | `components/ScreenshotGallery/` | Галерея скриншотов |
| `NewsCard` | `components/NewsCard/` | Карточка новости |
| `StatsCharts` | `components/StatsCharts/` | Графики статистики |
| `NavigationBlock` | `components/NavigationBlock/` | Навигационное меню |
| `RssSourcesPanel` | `components/RssSourcesPanel/` | Панель RSS источников |
| `AuthGuard` | `components/AuthGuard/` | HOC для защиты роутов |
| `AuthPopup` | `components/AuthPopup/` | Модальное окно авторизации |
| `LoginForm` | `components/LoginForm/` | Форма входа |
| `RegisterForm` | `components/RegisterForm/` | Форма регистрации |

#### Профиль компоненты (4 шт.)

| Компонент | Описание |
|-----------|----------|
| `ProfileHeader` | Шапка профиля с аватаром и статистикой |
| `ProfileGamesGrid` | Сетка игр пользователя |
| `ProfileGameCard` | Карточка игры в профиле |
| `ProfileSettingsModal` | Модальное окно настроек |

---

### 🔄 Contexts & Hooks

#### AuthContext (`contexts/AuthContext.tsx`)
**Предоставляет:**
- `user` — текущий пользователь
- `profile` — профиль пользователя
- `token` — JWT токен
- `isAuthenticated` — флаг авторизации
- `isLoading` — статус загрузки
- `login(login, password)` — функция входа
- `register(login, password)` — функция регистрации
- `logout()` — функция выхода
- `updateUser(userData)` — обновление пользователя
- `updateProfile(profileData)` — обновление профиля
- `refreshProfile()` — перезагрузка профиля

**Логика:**
1. При загрузке проверяет сессию через `/api/auth/check`
2. Сохраняет токен и данные в localStorage
3. Автообновление профиля при изменениях

---

#### GameActionsContext (`contexts/GameActionsContexts.tsx`)
**Предоставляет:**
- `actions` — объект действий по ID игр
- `setGameAction(gameId, action)` — установка действия
- `isLoading` — статус загрузки

**Структура actions:**
```typescript
type GameAction = {
  liked: boolean;
  disliked: boolean;
  in_wishlist: boolean;
  rating: number | null;
  completion_status: "not_played" | "playing" | "completed" | "dropped";
  purchase_status: "owned" | "not_owned" | "want_to_buy";
};
```

**Особенности:**
- Кэширование в sessionStorage (5 минут)
- Дедупликация запросов (pendingRequests Map)
- Автообновление при смене маршрута (debounce 100ms)
- Таймаут 8 секунд на запрос

---

#### Custom Hooks

**`useMediaActions`** (`hooks/useMediaActions.ts`)
- Управление медиа-контентом (скриншоты, трейлеры)

**Сервисы:**
- `gameService.ts` — утилиты для работы с играми, включая `proxifyImage()`
- `scrollService.ts` — управление скроллом

---

## 🗄 База данных (Supabase)

### Таблицы

#### 1. **users**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  login VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **user_profiles**
```sql
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  preferred_language VARCHAR(10) DEFAULT 'ru',
  total_likes INTEGER DEFAULT 0,
  total_dislikes INTEGER DEFAULT 0,
  total_games_added INTEGER DEFAULT 0
);
```

#### 3. **user_game_actions** ⭐
Основная таблица для хранения всех взаимодействий пользователя с играми.

```sql
CREATE TABLE user_game_actions (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER NOT NULL,
  game_name VARCHAR(255),
  game_image TEXT,
  action_type VARCHAR(50) NOT NULL, -- like, dislike, wishlist, rate, status_change, purchase_change
  rating INTEGER,
  genres JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  completion_status VARCHAR(50) DEFAULT 'not_played',
  purchase_status VARCHAR(50) DEFAULT 'not_owned',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, game_id, action_type) -- Для upsert
);
```

**Индексы:**
```sql
CREATE INDEX idx_user_game_actions_user_id ON user_game_actions(user_id);
CREATE INDEX idx_user_game_actions_game_id ON user_game_actions(game_id);
CREATE INDEX idx_user_game_actions_action_type ON user_game_actions(action_type);
```

#### 4. **games** (кэш)
```sql
CREATE TABLE games (
  rawg_id INTEGER PRIMARY KEY,
  name VARCHAR(255),
  slug VARCHAR(255),
  released DATE,
  background_image TEXT,
  rating DECIMAL(3,2),
  metacritic INTEGER,
  genres JSONB,
  tags JSONB,
  screenshots JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Аутентификация и JWT

### Flow аутентификации

```
1. Регистрация/Вход
   Client → POST /api/auth/login → Backend
   Backend: bcrypt.compare(password, hash)
   Backend: JWT.sign({ sub: userId, login })
   Backend → { user, token } → Client
   Client: localStorage.setItem('token', token)

2. Защищённый запрос
   Client → GET /api/games
   Next.js API Route: читает токен из cookies
   Next.js → GET /games + Authorization: Bearer token
   Backend: JWT Strategy валидирует токен
   Backend → данные → Client

3. Выход
   Client → POST /api/auth/logout
   Client: localStorage.clear()
   Client: redirect('/')
```

### JWT Конфигурация

```typescript
// auth.module.ts
JwtModule.registerAsync({
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: '7d' }, // 7 дней
  }),
});
```

### Guards

**JwtAuthGuard:**
```typescript
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
```

**OptionalJwt:**
Разрешает доступ как авторизованным, так и анонимным пользователям.

---

## 🎮 Система свайпов

### Алгоритм работы

1. **Инициализация**
   - Пользователь заходит на `/swipes`
   - Загружается первый батч (10 игр)

2. **Запрос игр**
   ```
   GET /api/swipes/swipes?limit=10&exclude=123,456,789
   ```
   - `exclude` — ID уже просмотренных игр

3. **Backend логика** (`swipeservice.getRandomGamesForSwipes`):
   - Получает ID игр пользователя из БД
   - Выбирает 3 случайные страницы из топ-10
   - Параллельно запрашивает их через RAWG Proxy
   - Фильтрует по критериям (rating >= 4.0, есть картинка)
   - Перемешивает и возвращает

4. **Свайп**
   - Пользователь свайпает карту
   - Действие добавляется в `pendingActions`
   - Запускается анимация

5. **Batch отправка**
   - Каждые 5 секунд OR когда набралось 10 действий
   - `POST /api/swipes/swipe-action/batch`
   - При закрытии вкладки — `navigator.sendBeacon()`

### Критерии качества игр для свайпов

```typescript
MIN_RATING = 4.0
Требуется: background_image
Исключаются: уже просмотренные игры
```

### Fallback сценарии

1. **Не хватило игр** → ещё 2 страницы (11-15)
2. **Вообще нет игр** → любые популярные с картинкой
3. **Ошибка API** → пустой массив (не ломает UI)

---

## 🚀 Кэширование (Redis)

### Настройка

```typescript
// app.module.ts
CacheModule.registerAsync({
  isGlobal: true,
  useFactory: async () => ({
    store: await redisStore({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
  }),
});
```

### Кэшируемые endpoints

| Endpoint | TTL | Примечание |
|----------|-----|------------|
| `GET /games` | 300s (5 мин) | Список игр |
| `GET /games/:id` | 3600s (1 час) | Детали игры |

### Frontend кэширование

**sessionStorage** (GameActionsContext):
- Ключ: `game_actions_${token}`
- TTL: 5 минут
- Данные: все действия пользователя

---

## ▶️ Запуск проекта

### Требования
- Node.js 18+
- Redis (локально или облако)
- Supabase аккаунт
- Доступ к RAWG Proxy (или свой)

### Установка

```bash
# 1. Клонирование
cd /workspace

# 2. Установка зависимостей backend
cd apps/backend
npm install

# 3. Установка зависимостей frontend
cd ../frontend
npm install
```

### Переменные окружения

#### Backend (`.env`)
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Redis
REDIS_URL=redis://localhost:6379

# Port
PORT=3001
```

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Запуск

```bash
# Terminal 1: Backend
cd apps/backend
npm run start:dev

# Terminal 2: Frontend
cd apps/frontend
npm run dev
```

### Проверка

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

---

## 📊 Диаграмма последовательности свайпа

```
User                    Frontend                Next.js API           Backend               Supabase
 │                         │                        │                     │                     │
 │─── Swipe Right ───────▶│                        │                     │                     │
 │                         │── Add to pending ────▶│                     │                     │
 │                         │                        │                     │                     │
 │                         │◀─── Batch Timer ──────│                     │                     │
 │                         │                        │                     │                     │
 │                         │── POST /batch ──────▶│── POST /batch ────▶│                     │
 │                         │                        │                     │── SELECT actions ─▶│
 │                         │                        │                     │◀────────────────────│
 │                         │                        │                     │── UPSERT action ──▶│
 │                         │                        │                     │◀────────────────────│
 │                         │                        │◀── Success ────────│                     │
 │                         │◀──────────────────────│                     │                     │
 │◀── Animation Complete ──│                        │                     │                     │
```

---

## 📝 Заключение

PlayPulse — это полнофункциональная платформа для открытия игр с:

✅ **Двухуровневой proxy-архитектурой** (Next.js API Routes + RAWG Proxy)  
✅ **Tinder-like свайпами** с batch-обработкой  
✅ **JWT аутентификацией** с refresh logic  
✅ **Supabase** для хранения данных  
✅ **Redis** для кэширования  
✅ **TypeScript** fullstack  
✅ **Модульной архитектурой** NestJS  

### Планы развития

- [ ] Интеграция AI для персональных рекомендаций
- [ ] Расширенная аналитика предпочтений
- [ ] Социальные функции (друзья, шаринг)
- [ ] Мобильное приложение
- [ ] Уведомления о скидках

---

**Документация актуальна на:** Декабрь 2024  
**Версия проекта:** 1.0.0  
**Контакты:** playpulse@example.com
