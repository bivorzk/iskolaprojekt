# HIGH PRIORITY FEATURES

- 



# Multi-Language Support (at least HUN/ENG (GB/UK))
# In-app feedback & bug reporting

# Figure out what should be at the home page - ✅ IMPLEMENTED (home_page.html exists)
# Push/pop notifications
- SMS/Email notifications for parents

# ADMIN & SECURITY FEATURES

# Super Admin Approval of critical admin change
# Admin impersonation (e.g admins can be students)
# Admin Activity History
# Admin Rate Limit Dashboard
- Admins can change rate limit within the dashboard

# Password breach check
- Check new password against known breach databases
- Force password reset on breach detection


# MOBILE & ACCESSIBILITY

# Make Mobile app with Dioxus for 2fa possibly more

# INTEGRATION & COMPLIANCE

# Implement location based security? - ✅ IMPLEMENTED (locationRiskAnalyzer)
# Parent-Teacher Portal Integration
- Connect with existing school management systems
- Grade-based meal recommendations


# TECHNICAL IMPROVEMENTS

## Maybe overhaul lua to C++?
# Make more lua scripts for redis? - ✅ IMPLEMENTED (redis-lua-service.js with multiple scripts)
- TTL management scripts
- Atomic user assignment operations
- Dashboard Metrics Aggregation for better performance
- Notification Queue for push/pop notifications
- Wallet balance atomic updates with validation - ✅ IMPLEMENTED
- Order processing with inventory deduction - ✅ IMPLEMENTED
- Advanced rate limiting with sliding windows - ✅ IMPLEMENTED (rate_limit.lua script with Redis sorted sets)

# Database Optimizations - ✅ PARTIALLY IMPLEMENTED (strategic indexes exist)
- Implement database sharding for scalability
- Add more strategic indexes - ✅ IMPLEMENTED
- Implement read replicas for performance

# Caching Enhancements - ✅ IMPLEMENTED (Redis caching with Lua scripts)
- Multi-level caching strategy - ✅ IMPLEMENTED
- Cache warming for popular items
- Intelligent cache invalidation


# TESTING & QUALITY

# Make tests in Zig/Qt depending on time
# Comprehensive Test Suite - ✅ PARTIALLY IMPLEMENTED (database tests, performance tests exist)
- Unit tests for all business logic
- Integration tests for payment flows
- Performance testing with Artillery - ✅ IMPLEMENTED
- Security penetration testing

# Monitoring & Alerting
- Application performance monitoring
- Real-time health checks - ✅ IMPLEMENTED (health routes)
- Automated error reporting
- User experience monitoring