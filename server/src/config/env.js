const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_me',
  // OpenRouter API ключи (через запятую для fallback, минимум 1)
  // Каждый ключ с $10+ даёт 1,000 бесплатных запросов/день
  openrouterApiKeys: process.env.OPENROUTER_API_KEYS || '',
  // Публичный URL приложения/бэкенда для ссылок в письмах
  appPublicUrl: process.env.APP_PUBLIC_URL || process.env.BASE_URL || 'http://localhost:3000',
  // SMTP (для разработки можно использовать Ethereal или Mailtrap)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@smartword.app',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',

  // ЮKassa (подписка)
  yookassaShopId: process.env.YOOKASSA_SHOP_ID || '',
  yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY || '',
  yookassaReturnUrl: process.env.YOOKASSA_RETURN_URL || process.env.APP_PUBLIC_URL || process.env.BASE_URL || 'http://localhost:3000',

  // Telegram Support Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
};

module.exports = { env };
