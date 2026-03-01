const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_me',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  // Публичный URL приложения/бэкенда для ссылок в письмах (например https://api.example.com или http://localhost:3000)
  appPublicUrl: process.env.APP_PUBLIC_URL || process.env.BASE_URL || 'http://localhost:3000',
  // SMTP (для разработки можно использовать Ethereal или Mailtrap)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@smartword.app',
};

module.exports = { env };

