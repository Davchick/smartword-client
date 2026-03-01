# Настройка аутентификации SmartWord

> **Ошибка «Unknown argument emailVerified»**: если вы видели эту ошибку при логине, выполните в папке `server`: `npx prisma generate` и перезапустите бэкенд. Prisma Client должен соответствовать схеме.

## 1. Бэкенд (server/.env)

Скопируйте `server/.env.example` в `server/.env` и заполните:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/smartword
PORT=4000
JWT_SECRET=сгенерируйте_надёжную_строку
JWT_REFRESH_SECRET=другая_надёжная_строка
APP_PUBLIC_URL=http://localhost:4000

# SMTP — для разработки можно оставить пустым (Ethereal создаст тестовый ящик, ссылки в консоли)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=noreply@smartword.app

# Google OAuth — Web client ID из Google Cloud Console
GOOGLE_CLIENT_ID=ваш_web_client_id.apps.googleusercontent.com
```

### Синхронизация Prisma

```bash
cd server
npx prisma db push
npx prisma generate
```

## 2. Клиент (client/.env)

Скопируйте `client/.env.example` в `client/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=ваш_web_client_id.apps.googleusercontent.com
```

- **Эмулятор**: `EXPO_PUBLIC_API_URL=http://localhost:4000`
- **Реальное устройство (Expo Go)**: `EXPO_PUBLIC_API_URL=http://192.168.1.XXX:4000` (IP вашего ПК, `ipconfig` на Windows)

## 3. Google OAuth — настройка в Google Cloud Console

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
2. Включите **Google+ API** (или **Google Identity Services**)
3. **Credentials** → **Create Credentials** → **OAuth client ID**
4. Создайте **Web application** — это будет `GOOGLE_CLIENT_ID` (используется на бэкенде и в `EXPO_PUBLIC_GOOGLE_CLIENT_ID`)
5. Для Android: создайте **Android** OAuth client, укажите package `com.smartword.app` и SHA-1 (из `keytool -list -v -keystore ~/.android/debug.keystore`)
6. Для iOS: создайте **iOS** OAuth client — Client ID вида `123456789-xxx.apps.googleusercontent.com` используется как `iosUrlScheme` в формате `com.googleusercontent.apps.123456789-xxx`

### Обновление app.json для iOS

В `client/app.json` замените `PLACEHOLDER_REPLACE_WITH_IOS_CLIENT_ID` на ваш iOS client ID (часть до `.apps.googleusercontent.com`):

```json
"iosUrlScheme": "com.googleusercontent.apps.123456789-abcdef"
```

## 4. Сборка приложения для Google Sign-In

Вход через Google **не работает в Expo Go** — нужна нативная сборка:

```bash
cd client
npx expo prebuild --clean
npx expo run:android
# или
npx expo run:ios
```

## 5. Запуск

```bash
# Терминал 1 — бэкенд
cd server && npm run dev

# Терминал 2 — клиент
cd client && npm start
```

## 6. Проверка

- **Регистрация**: email + пароль → письмо на почту → переход по ссылке → вход
- **Логин**: email + пароль после подтверждения
- **Google**: кнопка «Продолжить через Google» (только в dev build, не в Expo Go)
- **Забыл пароль**: запрос письма → ссылка → новый пароль
