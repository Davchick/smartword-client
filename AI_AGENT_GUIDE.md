# SmartWord — AI Agent Guide

## 📋 Overview

**SmartWord** is a mobile vocabulary learning application built with React Native (Expo) and Node.js/Express backend. The app helps users learn foreign language words through spaced repetition, AI-powered chat practice, and multiple training modes.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native 0.81.5, Expo SDK 54, TypeScript |
| **Navigation** | React Navigation 7 (Native Stack + Bottom Tabs) |
| **Backend** | Node.js, Express 5, Prisma ORM |
| **Database** | PostgreSQL |
| **AI** | OpenRouter API (arcee-ai/trinity-large-preview:free model) |
| **Auth** | JWT (access + refresh tokens), Google OAuth |
| **Styling** | Custom theme system with light/dark modes |

---

## 🏗️ Project Structure

```
SmartWord/
├── client/                 # React Native mobile app (Expo)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # Base UI (Button, GlassInput, Pill)
│   │   │   ├── Toast.tsx   # Toast notifications
│   │   │   ├── SwipeCard.tsx
│   │   │   └── ...
│   │   ├── contexts/       # React Context providers (AuthContext)
│   │   ├── hooks/          # Custom hooks (useWords, useGroups, useAuth)
│   │   ├── lib/            # Utilities (api.ts, googleSignIn.ts)
│   │   ├── navigation/     # React Navigation setup
│   │   │   ├── RootNavigator.tsx
│   │   │   ├── TabNavigator.tsx
│   │   │   └── types.ts
│   │   ├── screens/        # App screens
│   │   │   ├── Auth/       # SignIn, Welcome
│   │   │   ├── Main/       # Home screen
│   │   │   ├── Groups/     # Vocabulary groups management
│   │   │   ├── Training/   # Training modes & exercises
│   │   │   ├── Chat/       # AI chat practice
│   │   │   ├── Profile/    # User profile & settings
│   │   │   └── Billing/    # Premium subscription (YooKassa)
│   │   ├── theme/          # Theme system (colors, spacing, typography)
│   │   └── types/          # TypeScript type definitions
│   ├── App.js              # App entry point
│   ├── app.json            # Expo configuration
│   └── package.json
│
├── server/                 # Express API server
│   ├── src/
│   │   ├── config/         # Environment configuration
│   │   ├── db/             # Prisma client instance
│   │   ├── email/          # Email templates & sending (nodemailer)
│   │   ├── middleware/     # Express middleware (auth)
│   │   ├── modules/        # Feature modules (routes + logic)
│   │   │   ├── auth/       # Registration, login, Google OAuth
│   │   │   ├── words/      # CRUD, progress tracking
│   │   │   ├── groups/     # Vocabulary groups CRUD
│   │   │   ├── chat/       # AI chat, translation, hints
│   │   │   ├── profile/    # User profile management
│   │   │   ├── stats/      # User statistics
│   │   │   ├── billing/    # YooKassa payments
│   │   │   └── support/    # Telegram bot for support
│   │   └── server.js       # Express app entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
│
└── README.MD               # This file
```

---

## 🎯 Core Features

### 1. Vocabulary Management (Groups)
- Create vocabulary groups (dictionaries) by language
- Add/edit/delete words (original + translation)
- Words are organized by groups

**API Endpoints:**
- `GET /groups` — List all groups
- `POST /groups` — Create group
- `PATCH /groups/:id` — Rename group
- `DELETE /groups/:id` — Delete group (cascades to words)

### 2. Word Training System
Words have a `correct_count` field that tracks learning progress:
- **Correct answer**: +1 point
- **Incorrect answer**: -1 point
- **Archived**: When `correct_count >= 5`

**Training Modes:**
1. **Swipe Cards** — "Know / Don't Know" rapid review
2. **Write Mode** — Type the word from translation
3. **AI Chat** — Practice with AI using vocabulary context

### 3. Weekly Learning Limit (Freemium Model)
- **Free users**: 50 learned words per week (words reaching `correct_count >= 5`)
- **Premium users**: Unlimited
- Week resets every Monday

**Key Implementation:**
```javascript
// server/src/modules/words/words.routes.js
// POST /words/:id/progress
// Tracks: wordsLearnedThisWeek, weekStartDate
// Soft limit: words still archived but not counted after limit
```

### 4. AI Chat with Context
- Uses user's vocabulary as context for conversations
- **Free limit**: 10 AI messages (first message free, then paid)
- **Premium**: Unlimited
- Detects language from vocabulary group
- **System prompt**: AI acts as "Lexi" — a native speaker, not a teacher

**AI Service Features:**
- Multi-key fallback (OpenRouter API keys pool)
- Daily limit tracking (1000 requests/key/day with $10+ credit)
- Automatic key rotation on rate limits

### 5. Authentication
- Email/password with verification
- Google OAuth (auto-link to existing email)
- JWT tokens: Access (1h) + Refresh (7d)
- Guest mode (AsyncStorage only)

### 6. Premium Subscription
- YooKassa integration (Russian payment system)
- One-time payments with subscription extension
- Benefits: Unlimited words/week, unlimited AI messages

---

## 📊 Database Schema (Prisma)

```prisma
User
├── id, email, passwordHash
├── emailVerified, emailVerifyToken
├── googleId, googleEmail, googlePicture
├── isPremium, aiMessagesUsed
├── wordsLearnedThisWeek, weekStartDate
├── subscriptionType, subscriptionExpiresAt
├── groups (WordGroup[])
├── words (Word[])
├── refreshTokens (RefreshToken[])
└── trainingProgress (TrainingProgress[])

WordGroup
├── id, userId, name, language
└── words (Word[])

Word
├── id, userId, groupId (nullable)
├── original, translation
├── correctCount, lastReviewed
└── createdAt

TrainingProgress
├── id, userId, points, date (unique per user+date)
└── createdAt
```

---

## 🔑 Environment Variables

### Server (.env)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/smartword
PORT=4000
JWT_SECRET=change_me_super_secret
JWT_REFRESH_SECRET=change_me_refresh_secret

# OpenRouter API keys (comma-separated, min 1, recommended 3-5)
# Each $10+ key gives 1000 free requests/day
OPENROUTER_API_KEYS=key1,key2,key3

APP_PUBLIC_URL=http://localhost:4000

# SMTP (email verification, password reset)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=noreply@smartword.app

# Google OAuth
GOOGLE_CLIENT_ID=

# YooKassa (payments)
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=http://localhost:4000

# Telegram Support Bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
```

### Client (.env)
```bash
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
```

---

## 🚀 API Reference

### Authentication (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register with email/password |
| POST | `/auth/login` | Login (returns 403 `EMAIL_NOT_VERIFIED` if unverified) |
| POST | `/auth/google` | Google OAuth (id_token) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout (revoke refresh token) |
| GET | `/auth/verify-email?token=xxx` | Email verification (HTML page) |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| PATCH | `/auth/password` | Change password (requires auth) |

### Words (`/words`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/words?groupId=xxx` | List words (filtered by group) |
| POST | `/words` | Create word `{original, translation, group_id}` |
| PATCH | `/words/:id` | Update word |
| DELETE | `/words/:id` | Delete word |
| POST | `/words/:id/progress` | Update progress `{knew: boolean}` |

### Groups (`/groups`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | List groups with word counts |
| POST | `/groups` | Create group `{name, language}` |
| PATCH | `/groups/:id` | Rename group |
| DELETE | `/groups/:id` | Delete group |

### Chat (`/chat`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Chat with AI `{messages, group_id?, group_name?}` |
| POST | `/chat/translate` | Translate text |
| POST | `/chat/hint` | Generate reply hints |
| GET | `/chat/usage` | Get API key usage stats |

### Profile (`/profile`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get current user profile |
| PATCH | `/profile` | Update profile |

### Stats (`/stats`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Get user statistics (points, progress) |

### Billing (`/billing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/billing/create-payment` | Create YooKassa payment |
| POST | `/billing/webhook` | YooKassa webhook handler |

---

## 🎨 Frontend Architecture

### Navigation Structure
```
RootNavigator (Stack)
├── Welcome
├── SignIn
├── Main (TabNavigator)
│   ├── GroupsTab (Stack)
│   │   ├── Groups (list)
│   │   ├── GroupDetail (words list)
│   │   ├── Archive (learned words)
│   │   └── TrainingModes
│   ├── TrainingTab (Stack)
│   │   ├── TrainingModes
│   │   ├── Training (swipe)
│   │   └── TrainingWrite (typing)
│   ├── ChatTab (AI chat)
│   └── ProfileTab
├── ProfileSettings
└── BillingPayment
```

### Key Hooks
- **useAuth** — User authentication state
- **useWords** — Word CRUD + progress tracking
- **useGroups** — Group CRUD

### Theme System
Located in `client/src/theme/`:
- Light/dark mode support
- Color palettes, spacing, typography, fonts
- Montserrat (Russian UI), Poppins (English headings)

---

## 🧠 AI Integration Details

### Model Configuration
- **Provider**: OpenRouter
- **Model**: `arcee-ai/trinity-large-preview:free`
- **Fallback**: Multiple API keys with round-robin rotation
- **Daily Limit**: 1000 requests/key (with $10+ credit)

### System Prompts
Two modes:
1. **Free Chat**: Ask language preference, then switch permanently
2. **Vocabulary Practice**: Use user's words as context, act as native speaker

### Key Rules for AI
- Never use emojis
- 1-3 sentences per message
- One question max
- Match user's tone and language
- Never correct grammar
- Never reveal being AI

---

## 🔧 Development Commands

### Server
```bash
cd server
npm install
npm run dev      # Start with nodemon
npm run start    # Production start
```

### Client
```bash
cd client
npm install
npm start        # Expo dev server
npm run android  # Run on Android
npm run ios      # Run on iOS
```

### Database
```bash
cd server
npx prisma migrate dev    # Run migrations
npx prisma studio         # Open Prisma Studio
```

---

## 📱 Guest Mode

The app supports guest usage without authentication:
- Data stored in AsyncStorage
- Limited functionality (no cloud sync)
- Seamless transition to authenticated mode

---

## 🚨 Important Implementation Notes

### Word Progress Logic
```javascript
// When word.correct_count reaches 5:
// 1. Word is considered "learned" (archived)
// 2. For free users: increment wordsLearnedThisWeek
// 3. If weekly limit (50) reached: soft limit (word archived but not counted)
```

### Token Management
- Access token: 1 hour expiry
- Refresh token: 7 days, single-use (rotated on each refresh)
- Auto-refresh on 401 responses

### Email Verification
- Legacy users without verification tokens are auto-verified on login
- New users must verify before login

---

## 🎯 Common AI Agent Tasks

### Adding New Features
1. **Backend**: Add route in `server/src/modules/[feature]/`
2. **Database**: Update `prisma/schema.prisma`, run migration
3. **Frontend**: Add hook in `client/src/hooks/`, use in screens
4. **Types**: Update TypeScript types in `client/src/types/`

### Modifying Training Logic
- Edit `server/src/modules/words/words.routes.js` (POST `/words/:id/progress`)
- Update `client/src/hooks/useWords.ts` (updateWordProgress)

### Changing AI Behavior
- Edit `server/src/modules/chat/chat.routes.js` (system prompts)
- Modify `server/src/modules/chat/aiService.js` (model, fallback logic)

### UI/Theme Changes
- Colors: `client/src/theme/index.ts` (light/dark palettes)
- Components: `client/src/components/`
- Screens: `client/src/screens/`

---

## 📞 Support

- **Telegram Bot**: Configured via `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID`
- **Email**: SMTP configured for verification and password reset
- **Error Handling**: Console logging in development, structured errors in production

---

## 📄 License

ISC
