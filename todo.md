# HIGH PRIORITY FEATURES

# Multi-Language Support (at least HUN/ENG (GB/UK))
# In-app feedback & bug reporting 

# Figure out what should be at the home page 
# Push/pop notifications 
- Real-time WebSocket/SSE for order status updates
- SMS/Email notifications for parents
- Low balance warnings
- Food ready for pickup alerts

# Enhanced Menu Photos & Descriptions
- High-quality photos for each menu item
- Detailed nutritional information display
- Allergen warnings with visual indicators

# QR Code Integration
- Quick menu access via QR codes in cafeteria
- Table-based ordering for seated dining


# ADMIN & SECURITY FEATURES

# Super Admin Approval of critical admin change 
# Admin impersonation (e.g admins can be students)
# Admin Activity History
# Admin Rate Limit Dashboard
- Admins can change rate limit within the dashboard

# Password breach check 
- Check new password against known breach databases
- Force password reset on breach detection



# Advanced Fraud Detection
- ML-based suspicious activity detection
- IP geolocation anomaly alerts


# ANALYTICS & REPORTING

# Email summaries & scheduled reports
- Automated daily/weekly email reports for admins or parents (e.g., order stats, spending summaries)

# User Data export on request 
# API Usage Analytics
# Health Route both for normal users and one inside admin dashboard

# Advanced Analytics Dashboard
- Nutritional intake tracking for students
- Spending pattern analysis
- Predictive analytics for menu demand
- Carbon footprint tracking for sustainability
- Peak ordering time predictions

# Parent Spending Analytics
- Budget tracking and alerts
- Cost analysis and recommendations
- Financial literacy integration


# ORDERING & MENU FEATURES

# Implement daily menu
# Menu recommendation engine???
- Suggest menu based on order history/preferences 
- AI-powered nutritional recommendations
- Dietary restriction smart filtering

# Smart Ordering Features
- Voice-activated ordering for accessibility
- Group orders for classes/teams
- Meal planning (week/month ahead)
- Recurring order setup

# Enhanced Dietary Management
- Comprehensive allergen database
- Diet-specific menus (vegan, gluten-free, religious)
- Medical dietary requirement integration with school nurse


# GAMIFICATION & LOYALTY

# Achievement System & Badges
- Healthy eating achievements
- Try new foods challenges
- Consistency rewards

# SOCIAL & COMMUNITY

# Parent - Student chat? -> Student/Student -> Student/Admin etc...??
# Enhanced Review & Rating System
- Photo reviews of meals
- Taste ratings with detailed feedback
- Community recipe sharing

# Social Feed Features???
- Share favorite healthy meals
- Community nutrition tips
- School-wide charity fundraising through purchases


# PAYMENT & FINANCIAL

# Implement location based currency

# Budget Management Tools
- Parent-set spending limits
- Savings goal tracking
- Expense categorization (lunch vs snacks)


# INVENTORY & OPERATIONS

# Automated Inventory Management
- Real-time stock tracking
- Automatic reordering from suppliers
- Expiration date monitoring
- Waste management tracking

# Kitchen Management Dashboard
- Order preparation workflow optimization
- Time-slot based ordering to reduce wait times
- Real-time kitchen display system


# MOBILE & ACCESSIBILITY

# Make Mobile app with Qt6 for 2fa possibly more 
# Progressive Web App (PWA) Development
# Offline Mode Capabilities
- Cache menus for spotty internet
- Queue orders when offline

# Enhanced Accessibility
- Screen reader support
- High contrast mode
- Simplified interfaces for learning difficulties
- Photo-based ordering for reading difficulties


# INTEGRATION & COMPLIANCE

# Implement location based security?
# Parent-Teacher Portal Integration
- Connect with existing school management systems
- Grade-based meal recommendations

# COPPA Compliance Features
- Enhanced privacy controls for minors
- Parental consent management
- Age-appropriate interfaces

# Health Department Compliance
- Automated reporting for nutrition standards
- Food safety tracking
- Allergen incident reporting


# TECHNICAL IMPROVEMENTS

## Maybe overhaul lua to C++?
# Make more lua scripts for redis?
- TTL management scripts
- Atomic user assignment operations
- Dashboard Metrics Aggregation for better performance
- Notification Queue for push/pop notifications
- Wallet balance atomic updates with validation
- Order processing with inventory deduction
- Advanced rate limiting with sliding windows

# Database Optimizations
- Implement database sharding for scalability
- Add more strategic indexes
- Implement read replicas for performance

# Caching Enhancements  
- Multi-level caching strategy
- Cache warming for popular items
- Intelligent cache invalidation


# TESTING & QUALITY

# Make tests in Zig/Qt depending on time
# Comprehensive Test Suite
- Unit tests for all business logic
- Integration tests for payment flows
- Performance testing with Artillery
- Security penetration testing

# Monitoring & Alerting
- Application performance monitoring
- Real-time health checks
- Automated error reporting
- User experience monitoring