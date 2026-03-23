# Достижения и Streaks — Руководство по внедрению

## 📋 Обзор

В проект SmartWord была добавлена система достижений и streaks (ежедневных серий) для повышения вовлечённости пользователей.

---

## 🎯 Реализованный функционал

### 1. Достижения (Achievements)

**Категории достижений:**

| Категория | Достижения |
|-----------|------------|
| **Streak** | Первый шаг (1 день), Недельный воин (7 дней), Месяц силы (30 дней), Легенда streak (100 дней) |
| **Words** | Первое слово (1), Исследователь (10), Коллекционер (50), Мастер слов (100), Легенда словаря (500) |
| **Swipe** | Свайп новичок (10), Мастер свайпа (100), Легенда свайпа (500) |
| **Chat** | Первый диалог (1), Любитель поболтать (10), Мастер общения (50) |

**Механика:**
- Каждое достижение имеет порог (threshold) и награду в очках (points)
- Прогресс отслеживается автоматически при действиях пользователя
- При разблокировке достигается уведомление

### 2. Streak System (Серии)

**Что отслеживается:**
- `currentStreak` — текущая серия дней подряд
- `longestStreak` — лучшая серия за всё время
- `totalActivity` — всего дней активности
- `lastActivity` — последняя активность

**Правила:**
- Streak обновляется при любой активности (тренировка слов, AI-чат)
- Если пользователь пропустил день — streak сбрасывается в 0
- Проверка и сброс происходят автоматически через cron job (в 3:00 AM)

### 3. Push-уведомления

**Типы уведомлений:**
- 📅 **Ежедневное напоминание** — в 20:00 (настраивается)
- 🏆 **Новое достижение** — при разблокировке достижения
- 💔 **Потеря streak** — при сбросе серии

---

## 🗄️ База данных

### Новые таблицы

```sql
-- Achievement: шаблоны достижений
CREATE TABLE "Achievement" (
  "id" UUID PRIMARY KEY,
  "name" TEXT UNIQUE,
  "title" TEXT,
  "description" TEXT,
  "icon" TEXT,
  "category" TEXT,
  "threshold" INTEGER,
  "points" INTEGER DEFAULT 0,
  "enabled" BOOLEAN DEFAULT true
);

-- UserAchievement: прогресс пользователя
CREATE TABLE "UserAchievement" (
  "id" UUID PRIMARY KEY,
  "userId" UUID REFERENCES "User"(id),
  "achievementId" UUID REFERENCES "Achievement"(id),
  "progress" INTEGER DEFAULT 0,
  "unlocked" BOOLEAN DEFAULT false,
  "unlockedAt" TIMESTAMP,
  UNIQUE("userId", "achievementId")
);

-- UserStreak: серии пользователя
CREATE TABLE "UserStreak" (
  "id" UUID PRIMARY KEY,
  "userId" UUID UNIQUE REFERENCES "User"(id),
  "currentStreak" INTEGER DEFAULT 0,
  "longestStreak" INTEGER DEFAULT 0,
  "lastActivity" DATE,
  "totalActivity" INTEGER DEFAULT 0
);
```

---

## 🔌 API Endpoints

### Achievements

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/achievements` | Все достижения с прогрессом |
| GET | `/api/achievements/summary` | Сводка (всего, открыто, очки) |
| POST | `/api/achievements/check` | Проверить прогресс (action, value) |

### Streaks

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/streaks` | Текущий streak пользователя |
| POST | `/api/streaks/check-in` | Отметить активность сегодня |
| GET | `/api/streaks/history` | История за 30 дней |

---

## 📱 Frontend компоненты

### Хуки

```typescript
// useAchievements
const { achievements, summary, loading, checkAchievements } = useAchievements();

// useStreak
const { streak, history, checkIn, loading } = useStreak();

// useNotifications
const { setReminder, disableReminder } = useNotifications();
```

### UI компоненты

- `<AchievementCard achievement={...} />` — карточка достижения
- `<StreakCounter streak={5} longestStreak={10} />` — счётчик серии

### Экраны

- `/Achievements` — экран достижений (доступен из настроек профиля)

---

## 🔧 Интеграция

### Backend: Автоматическое обновление

Достижения и streaks обновляются автоматически в:

1. **POST /words/:id/progress** — при тренировке слов
   - `word_learned` +1 при выучивании слова
   - streak check-in

2. **POST /chat** — при сообщении AI
   - `chat_message` +1
   - streak check-in

### Cron задачи

```javascript
// server/src/cron/index.js

// Ежедневно в 3:00 — проверка и сброс streaks
cron.schedule('0 3 * * *', async () => {
  await dailyStreakCheck();
});

// Каждый час — синхронизация достижений
cron.schedule('0 * * * *', async () => {
  await syncAchievementsProgress(prisma);
});
```

---

## 🚀 Запуск

### 1. Миграция БД

```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 2. Установка зависимостей

```bash
# Server
cd server
npm install

# Client
cd client
npm install
```

### 3. Запуск

```bash
# Server
npm run dev

# Client
npm start
```

---

## 🎨 Настройка

### Изменение достижений

Отредактируйте `server/src/modules/achievements/achievements.service.js`:

```javascript
const DEFAULT_ACHIEVEMENTS = [
  {
    name: 'new_achievement',
    title: 'Новое достижение',
    description: 'Описание',
    icon: '🎯',
    category: 'words',
    threshold: 25,
    points: 100
  }
];
```

### Настройка напоминаний

В `client/src/hooks/useNotifications.ts`:

```typescript
export const useNotifications = ({
  enableDailyReminder = true,
  reminderHour = 20,  // 20:00
  reminderMinute = 0,
} = {}) => { ... }
```

---

## 📊 Мониторинг

### Проверка достижений

```bash
curl http://localhost:3000/achievements \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Проверка streaks

```bash
curl http://localhost:3000/streaks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ Важные заметки

1. **Первый запуск:** Достижения инициализируются автоматически при старте сервера
2. **Guest mode:** Достижения и streaks работают только для авторизованных пользователей
3. **Timezone:** Cron задачи используют Moscow timezone (Europe/Moscow)
4. **Push-уведомления:** Требуют настройки Expo Push Token для production

---

## 🔮 Будущие улучшения

- [ ] Кастомные иконки для достижений
- [ ] Leaderboard между пользователями
- [ ] Сезонные достижения
- [ ] Интеграция с Google Fit / Apple Health
- [ ] Push-уведомления о почти достигнутом прогрессе

---

## 📞 Поддержка

Вопросы и предложения: support@smartword.app
