# SnapTray Admin & User Security Features

## Existing Features
### Authentication Security
- Rate limiting (bruteforce protection)
- CAPTCHA (optional)
- Email verification
- Password reset
- IP tracking
- 2FA
- Password blacklist
- Password strength (zxcvbn)
- Disposable email rejection
- Weak password filtering
- Username banned-words filtering
- Input length limits

### General Input Security
- Input validation
- XSS prevention
- SQL Injection / MongoDB injection prevention
- dotenv protection
- Hashing (bcrypt)
- Uniqueness checks

## Additional Security Features

### API & Backend Protection
- CSRF protection (tokens, same-site cookies)
- CORS restrictions (allow only school domain)
- Helmet middleware (secure headers: HSTS, X-Frame-Options, X-Content-Type-Options)
- Strict rate limiting per endpoint
- Request origin validation

### Session & Cookie Security
- Secure cookies (`HttpOnly`, `Secure`, `SameSite=Strict`)
- Token rotation (JWT/session)
- Auto logout after inactivity (10-30 min)

### Account Security
- Failed login cooldown (lockout after X failed attempts)
- Geolocation & suspicious login alerts
- Device management (logout from all devices)
- Password reuse detection (prevent last N passwords)

### Admin Dashboard Security
- Role-based access control (RBAC)
- Activity logs (menu, stock, price, role changes)
- IP whitelisting for admin (optional)

### Data & Database Protection
- MongoDB operator injection protection (`$ne`, `$or`, `$gt`, `$regex`, etc.)
- Database index hardening
- Encrypt sensitive data at rest (financial info)
- Regular encrypted backups
- Audit trails for orders, payments, refunds

### Frontend Security
- Content Security Policy (CSP)
- Input sanitizers (DomPurify)
- Clickjacking protection (`X-Frame-Options: DENY`)
- Disable debug info in production

### Payment Security
- Card tokenization
- Event webhook validation
- Anti-fraud monitoring (multiple transactions, refunds, failed payments)

### Insider Threat Protection
- Admin action confirmation
- Dual-approval for critical changes
- IP & device logging for admins

### System-Level Security
- Error handling without leaking info
- Automated restart on crash (PM2 / Docker)
- Dependency vulnerability scans (npm audit / Snyk)
- Log rotation

### Optional Advanced Protections
- ML-based fraud detection
- Access pattern anomaly detection
- Encrypted session replay prevention
