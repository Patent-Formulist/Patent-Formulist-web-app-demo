# Patent FormuList — Web

Веб-интерфейс к сервису автоматизации патентных заявок: работа с патентами,
аналогами, признаками, статистикой, генерацией заявки и чертежами.

> Демонстрационная версия: офлайн-моки удалены, приложение работает только
> против реального API.

## Стек

- **React 19** + Vite 6
- **React Router 7**, react-hook-form
- `jwt-decode` — разбор токена, `xlsx` — экспорт таблиц

## Быстрый старт

Нужны Node.js 18+ и запущенный backend (см. репозиторий
`AI-assistant-for-patents-monolithic`).

```bash
npm ci
npm run dev          # http://localhost:3000
```

Запросы к `/api` проксируются на backend через Vite (`vite.config.js`,
`PROXY_TARGET` в `src/services/appConfig.js`, по умолчанию
`http://localhost/api/v2`).

### Через Docker

В compose-стеке бэкенда фронтенд собирается из этого репозитория и доступен по
адресу http://localhost/ рядом с API:

```bash
# в репозитории бэкенда
docker compose -f compose.dev.yaml --env-file .env.dev up -d --build
```

Путь к этому репозиторию задаётся переменной `FRONTEND_PATH`.

## Сборка

```bash
npm run build        # dist/
npm run preview      # локальный просмотр сборки
```

## Структура

```
src/
├── components/      общие компоненты
├── contexts/        React-контексты (авторизация и т.п.)
├── features/        функциональные модули (auth, patents, ...)
├── layouts/         каркасы страниц
├── resources/       статика и палитры
├── routes/          маршрутизация
└── services/        слой API: auth, patent, reference, profile
```

Слой `src/services/*` — единственное место, где выполняются HTTP-запросы;
эндпоинты собраны в `src/services/apiConfig.js` (относительный путь `/api/v2`).

## Как работает авторизация

Токены хранятся в `localStorage` (`accessToken`, `refreshToken`), запросы
выполняются через `authService.authenticatedFetch`, refresh — через
`authService.refreshToken`.

## Лицензия

См. [LICENSE](LICENSE).