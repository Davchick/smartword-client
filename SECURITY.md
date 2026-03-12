# SmartWord Security Documentation

## 🔒 Security Fixes Implemented

This document describes the security measures implemented in SmartWord to protect against OWASP Mobile Top 10 vulnerabilities.

---

## 1. Data Storage Security

### ✅ Encrypted Token Storage
- **Location:** `client/src/lib/api.ts`
- **Implementation:** Using `expo-secure-store` instead of `AsyncStorage`
- **Protection:**
  - iOS: Keychain encryption
  - Android: Encrypted SharedPreferences
- **Before:** Tokens stored in plain text
- **After:** All JWT tokens encrypted at rest

### ✅ Encrypted Guest Data
- **Location:** `client/src/lib/encryptedStorage.ts`
- **Implementation:** AES-256 encryption with device-specific key
- **Protected Data:**
  - Guest vocabulary groups
  - Guest words
  - User preferences

---

## 2. Communication Security

### ✅ HTTPS Enforcement
- **Location:** `client/src/lib/api.ts:getBaseUrl()`
- **Protection:** Production builds reject HTTP URLs
- **Error:** Throws exception if HTTPS not used in production

### ✅ Certificate Pinning Ready
- **Recommendation:** Add `expo-ssl-pinning` for production
- **Implementation Guide:** See "Next Steps" below

### ✅ CORS Configuration
- **Location:** `server/src/server.js`
- **Protection:** Restricts API to known origins only
- **Configuration:** `ALLOWED_ORIGINS` environment variable

---

## 3. Authentication Security

### ✅ Strong JWT Secrets Validation
- **Location:** `server/src/config/env.js`
- **Requirements:**
  - Minimum 32 characters
  - No default/weak values
  - Server fails to start if invalid
- **Generation Command:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### ✅ Rate Limiting
- **Location:** `server/src/middleware/rateLimiter.js`
- **Limits:**
  | Endpoint | Limit | Window |
  |----------|-------|--------|
  | `/auth/login` | 10 requests | 15 minutes |
  | `/auth/register` | 10 requests | 15 minutes |
  | `/auth/refresh` | 20 requests | 15 minutes |
  | `/auth/forgot-password` | 5 requests | 1 hour |
  | `/auth/resend-verification` | 5 requests | 1 hour |
  | General API | 100 requests | 15 minutes |

### ✅ Device Fingerprinting
- **Location:** `server/src/middleware/auth.js`
- **Implementation:** SHA-256 hash of User-Agent + Accept-Language
- **Protection:** Detects token theft and suspicious activity
- **Action:** Revokes tokens if device fingerprint changes

### ✅ Refresh Token Rotation
- **Location:** `server/src/modules/auth/auth.routes.js`
- **Features:**
  - Automatic rotation on each use
  - Device fingerprint tracking
  - Last used timestamp
  - Automatic revocation on suspicious activity

---

## 4. Input Validation & Injection Prevention

### ✅ SQL Injection Prevention
- **ORM:** Prisma with parameterized queries
- **ESLint Rule:** Blocks `$queryRaw` and `$executeRaw`
- **Location:** `server/.eslintrc.json`

### ✅ Request Size Limits
- **Location:** `server/src/server.js`
- **Limit:** 10MB maximum body size
- **Protection:** Prevents DoS via large payloads

---

## 5. Error Handling & Information Leakage

### ✅ Standardized Error Responses
- **Location:** `server/src/middleware/errorHandler.js`
- **Features:**
  - Generic error messages in production
  - Detailed errors only in development
  - No stack traces exposed
  - Consistent error format

### ✅ Error Type Mapping
| Internal Error | Public Message |
|----------------|----------------|
| `AUTH_FAILED` | "Authentication failed" |
| `INVALID_TOKEN` | "Invalid or expired token" |
| `USER_NOT_FOUND` | "Authentication failed" |
| `DATABASE_ERROR` | "A database error occurred" |
| `INTERNAL_ERROR` | "An unexpected error occurred" |

---

## 6. HTTP Security Headers

### ✅ Helmet.js Implementation
- **Location:** `server/src/middleware/securityHeaders.js`
- **Headers:**
  - Content Security Policy (CSP)
  - X-Content-Type-Options (no sniff)
  - X-Frame-Options (deny clickjacking)
  - Strict-Transport-Security (HSTS)
  - X-XSS-Protection
  - Referrer-Policy
  - Cross-Origin-Embedder-Policy
  - Cross-Origin-Opener-Policy
  - Cross-Origin-Resource-Policy

---

## 7. Database Security

### ✅ Refresh Token Schema
- **Location:** `server/prisma/schema.prisma`
- **Fields:**
  - `deviceFingerprint` - Track device
  - `lastUsedAt` - Monitor activity
  - `revokedAt` - Token revocation
  - Index on `[userId, deviceFingerprint]`

---

## Setup Instructions

### 1. Generate Secure Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in all required values:

```bash
cd server
cp .env.example .env
# Edit .env with your secure values
```

### 3. Install Dependencies

```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
```

### 4. Update Database Schema

```bash
cd server
npx prisma migrate dev --name add_device_fingerprint
```

---

## Security Checklist for Production

- [ ] Generate strong JWT secrets (min 32 chars)
- [ ] Set `ALLOWED_ORIGINS` to production domains
- [ ] Configure HTTPS for API endpoint
- [ ] Set up SSL certificate pinning (recommended)
- [ ] Enable SMTP for production emails
- [ ] Configure Telegram bot for support
- [ ] Review and test rate limiting
- [ ] Enable production logging (no sensitive data)
- [ ] Set up monitoring for suspicious activity alerts
- [ ] Regular security audits with MobSF

---

## Recommended Security Tools

### Mobile Security
- **MobSF** - Mobile Security Framework (static + dynamic analysis)
- **Frida** - Runtime manipulation testing
- **QARK** - Android static analysis

### Backend Security
- **npm audit** - Dependency vulnerabilities
- **Snyk** - Continuous security monitoring
- **Semgrep** - Custom security rules

### Network Security
- **Burp Suite** - MITM testing
- **Wireshark** - Traffic analysis

---

## Incident Response

### If Token Theft is Suspected

1. **Immediate:**
   - Revoke all refresh tokens for affected user
   - Force re-authentication
   - Log all recent activity

2. **Investigation:**
   - Check device fingerprints in logs
   - Review IP addresses
   - Analyze timing patterns

3. **Prevention:**
   - Review rate limiting effectiveness
   - Consider shortening token expiry
   - Implement IP-based restrictions

### Contact

Report security vulnerabilities to: security@smartword.app

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-12 | Initial security implementation |
| - | - | - Encrypted token storage |
| - | - | - Rate limiting |
| - | - | - Device fingerprinting |
| - | - | - Security headers |
| - | - | - Error handling |
