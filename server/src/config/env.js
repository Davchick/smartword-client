const dotenv = require('dotenv');

dotenv.config();

/**
 * Validate that a secret is strong enough (min 32 chars, not a default value)
 */
function validateSecret(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }
  if (value.includes('change_me') || value.includes('dev_') || value === 'secret') {
    throw new Error(`${name} contains default/weak value. Generate a secure random value`);
  }
  return value;
}

/**
 * Validate critical security configuration on startup.
 * Fails fast if security requirements are not met.
 */
function validateSecurityConfig() {
  const errors = [];
  
  // Validate JWT secrets
  try {
    validateSecret(process.env.JWT_SECRET, 'JWT_SECRET');
  } catch (err) {
    errors.push(err.message);
  }
  
  try {
    validateSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
  } catch (err) {
    errors.push(err.message);
  }
  
  // Validate database URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  
  // Warn about optional but recommended settings
  if (!process.env.SMTP_HOST) {
    console.warn('[CONFIG] SMTP not configured - email features will use test mode');
  }
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn('[CONFIG] Google OAuth not configured - Google Sign-In will be disabled');
  }
  
  // Throw if critical errors
  if (errors.length > 0) {
    console.error('\n=== SECURITY CONFIGURATION ERRORS ===\n');
    errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error('\n=== Generate secure values with: ===\n');
    console.error("  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    console.error('\n=====================================\n');
    throw new Error(`Security configuration validation failed: ${errors.join('; ')}`);
  }
  
  console.log('[CONFIG] Security configuration validated ✓');
}

const env = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: validateSecret(process.env.JWT_SECRET, 'JWT_SECRET'),
  jwtRefreshSecret: validateSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
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

// Run validation before exporting
validateSecurityConfig();

module.exports = { env };
