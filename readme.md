## Starting the app
```
npm start    # Recommended - runs the application
npm run dev  # Development mode with nodemon for auto-restart
node src/main.js  # Direct execution
```

## Gitignore file tartalma:

```
.vscode/settings.json
node_modules/faker
config/exports
config/sql.js
config/users.sql
node_modules/react
node_modules/artillery
node_modules/redis
node_modules/@redis
node_modules/connect-redis
node_modules/cluster-key-slot
node_modules/
```

## npm list


These are the current node modules that are needed to run the application

```
├── @google-cloud/recaptcha-enterprise@6.3.0
├── @paypal/paypal-server-sdk@1.1.0
├── artillery@2.0.27
├── autoprefixer@10.4.23
├── badwords-list@2.0.1-4
├── bcrypt@6.0.0
├── connect-redis@9.0.0
├── cors@2.8.5
├── crypto@1.0.1
├── dotenv@17.2.3
├── ejs@3.1.10
├── express-mongo-sanitize@2.2.0
├── express-rate-limit@8.1.0
├── express-session@1.18.2
├── express@4.21.2
├── helmet@8.1.0
├── hpp@0.2.3
├── jsonwebtoken@9.0.2
├── mongodb@6.20.0
├── mongoose@8.18.2
├── nanoid@5.1.6
├── node-fetch@2.7.0
├── node-iplocate@2.0.1
├── nodemailer@7.0.9
├── nodemon@3.1.0
├── paypal@1.0.1
├── postcss@8.5.6
├── rate-limit-redis@4.3.1
├── react@19.2.1
├── redis@5.10.0
├── serve-favicon@2.5.1
├── simple-statistics@7.8.8
├── tailwindcss@4.1.18
├── xss-clean@0.1.4
└── zxcvbn@4.4.2

Dev Dependencies:
├── autoprefixer@10.4.23
├── nodemon@3.0.1
├── postcss@8.5.6
└── tailwindcss@4.1.18
```


## Directory Structure

```
├── code_analytics.json         # Code analytics data
├── package.json                # Node.js dependencies and scripts
├── postcss.config.js          # PostCSS configuration
├── readme.md                   # Project documentation
├── tailwind.config.js         # Tailwind CSS configuration
├── config/                     # Configuration files
│   ├── database_queries.js
│   ├── hu.json
│   └── LOYALTY_CONSTANTS.JS
├── data/                       # Data files
│   ├── disposable_email_list.json
│   ├── Most_used_passwords.json
│   ├── password_characters.json
│   └── database_test/          # Test database files
│       ├── Food_Items.json
│       └── menu_items.json
├── docs/                       # Documentation
│   ├── database.png
│   ├── DatabaseDoc.md
│   ├── Paypal_TestDetails.txt
│   └── sourcefor_security_checks.txt
├── public/                     # Static files served to client (Frontend)
│   ├── googlepay.js
│   ├── index.html
│   ├── password_reset.html
│   ├── pay.html
│   ├── paypal.js
│   ├── register.html
│   ├── verify.html
│   ├── 404/                    # 404 error pages
│   │   ├── 404.html
│   │   └── 404.jsx
│   ├── 429/                    # 429 error pages
│   │   ├── 429.html
│   │   └── 429.jsx
│   ├── css/                    # Stylesheets
│   │   ├── register.css
│   │   └── tailwind.css
│   ├── dashboard/              # Dashboard pages
│   │   ├── admin/
│   │   │   ├── admin.css
│   │   │   ├── admin.html
│   │   │   ├── admin.js
│   │   │   ├── admin.jsx
│   │   │   ├── AdminHeader.jsx
│   │   │   ├── AdminSidebar.jsx
│   │   │   ├── admin_old.html
│   │   │   ├── MenuItemsSection.jsx
│   │   │   ├── SettingsSection.jsx
│   │   │   ├── StatsSection.jsx
│   │   │   ├── useAdminData.js
│   │   │   └── UsersSection.jsx
│   │   └── student/
│   │       ├── OrdersSection.jsx
│   │       ├── SettingsSection.jsx
│   │       ├── StatsSection.jsx
│   │       ├── student.css
│   │       ├── student.html
│   │       ├── student.js
│   │       ├── student.jsx
│   │       ├── StudentHeader.jsx
│   │       ├── StudentSidebar.jsx
│   │       ├── student_old.html
│   │       ├── TransactionsSection.jsx
│   │       ├── useStudentData.js
│   │       └── WalletSection.jsx
│   ├── home_page/              # Home page files
│   │   ├── home_page.html
│   │   └── home_page.jsx
│   ├── information/            # Information pages
│   │   ├── index.html
│   │   └── information.jsx
│   ├── no_perm/                # No permission pages
│   │   ├── index.html
│   │   └── no_perm.jsx
│   └── Order/                  # Order pages
│       ├── index.css
│       ├── index.html
│       ├── index_old.html
│       ├── order.jsx
│       └── script.js
├── src/                        # Server-side source code (backend)
│   ├── api.js
│   ├── chapta.js
│   ├── database_backup.js      # Backup database file
│   ├── database_original.js    # Original database file (rollback)
│   ├── database.js
│   ├── logout.js
│   ├── main.js
│   ├── redis.js
│   ├── Register.jsx
│   ├── verificationStore.js
│   ├── admin/
│   │   └── admin.js
│   ├── auth/                   # Authentication modules
│   │   ├── 2fa.js
│   │   ├── email_verification.js
│   │   ├── index.js
│   │   ├── login.js
│   │   ├── middleware.js
│   │   ├── password_reset.js
│   │   ├── passwordhash.js
│   │   ├── register.js
│   │   ├── security.js
│   │   └── validation.js
│   ├── dashboard/
│   │   ├── dashboard.js
│   │   ├── admin/
│   │   │   └── admin.js
│   │   ├── middleware/
│   │   │   └── auth-middleware.js
│   │   ├── services/
│   │   │   └── cache-service.js
│   │   ├── statistics/
│   │   │   └── statistics.js
│   │   └── student/
│   │       └── student.js
│   ├── middleware/
│   │   └── security.js
│   ├── models/
│   │   └── User.js
│   ├── Orders/
│   │   └── Order.js
│   ├── payments/
│   │   ├── googlepay.js
│   │   └── paypal.js
│   └── services/               # Service modules
│       ├── googlepay-service.js
│       ├── order-service.js
│       └── paypal-service.js
├── tests/                      # Test files
│   ├── code_analytic.py
│   ├── code_analytics.json
│   ├── creating_test_users.js
│   ├── database_testing.js
│   ├── fake_data.py
│   ├── menu_items.json
│   ├── Paypal_TestConfig.txt
│   ├── register_testing.py
│   ├── Jest/                   # Jest test directory
│   └── performance_tests/      # Performance test files
│       └── artillery.yml
└── readme.md                   # Project documentation
```

## Router Routes

### Main Application Routes (Static Pages)
![GET](https://img.shields.io/badge/GET-blue)  /login                    # Login page

![GET](https://img.shields.io/badge/GET-blue)  /register                 # Registration page

![GET](https://img.shields.io/badge/GET-blue)  /password-reset/:token    # Password reset page

![GET](https://img.shields.io/badge/GET-blue)  /pay                      # Payment page

### Authentication Routes
![POST](https://img.shields.io/badge/POST-green) /register                 # User registration

![POST](https://img.shields.io/badge/POST-green) /login                    # User login

![POST](https://img.shields.io/badge/POST-green) /logout                   # User logout

![GET](https://img.shields.io/badge/GET-blue) /logout                   # Logout confirmation

![POST](https://img.shields.io/badge/POST-green) /2fa                      # Two-factor authentication

### Email Verification Routes
![POST](https://img.shields.io/badge/POST-green) /email-verification/verify-code    # Verify email code

![GET](https://img.shields.io/badge/GET-blue) /email-verification/verify/:token  # Verify email with token

### Password Reset Routes  
![POST](https://img.shields.io/badge/POST-green) /password-reset/          # Request password reset

![GET](https://img.shields.io/badge/GET-blue) /password-reset/:token    # Password reset form

![POST](https://img.shields.io/badge/POST-green) /password-reset/:token    # Submit new password

![POST](https://img.shields.io/badge/POST-green) /forgot-password/         # Forgot password request

### Dashboard Routes
![GET](https://img.shields.io/badge/GET-blue) /dashboard/               # Main dashboard

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin          # Admin dashboard page

![GET](https://img.shields.io/badge/GET-blue) /dashboard/student        # Student dashboard page

### Admin Dashboard API Routes
![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/usercount        # Get user count

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/userlist         # Get list of users

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/stats            # Get admin statistics

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/signup-stats     # Get signup statistics

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/orders           # Get orders data

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/soldout          # Get sold out items

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/itemcount        # Get item count

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/menulist         # Get menu items list

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/stockalerts      # Get stock alerts

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/paymentstats     # Get payment statistics

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/welcome-message  # Get welcome message

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/health           # System health check

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/menuitem_export  # Export menu items

![GET](https://img.shields.io/badge/GET-blue) /dashboard/admin/delete_menuitem/:id  # Delete menu item

![POST](https://img.shields.io/badge/POST-green) /dashboard/admin/create_menuitem  # Create new menu item

![PUT](https://img.shields.io/badge/PUT-orange) /dashboard/admin/menuitem/:id     # Update menu item

### Student Dashboard Routes
![GET](https://img.shields.io/badge/GET-blue) /dashboard/student/freeze_account # Freeze student account

![POST](https://img.shields.io/badge/POST-green) /dashboard/student/parent/link    # Link parent account

### Order Management Routes
![GET](https://img.shields.io/badge/GET-blue) /Order/                   # Order page

![GET](https://img.shields.io/badge/GET-blue) /Order/menu_items         # Get menu items for ordering

![GET](https://img.shields.io/badge/GET-blue) /Order/:orderID           # Get specific order details

![POST](https://img.shields.io/badge/POST-green) /Order/Order              # Create new order

![PUT](https://img.shields.io/badge/PUT-orange) /Order/:orderID/status    # Update order status

![POST](https://img.shields.io/badge/POST-green) /Order/:orderID/capture   # Capture order payment

### Admin Management Routes
![GET](https://img.shields.io/badge/GET-blue) /admin/changeuser         # Change user permissions

## API Routes

### General API Routes
![GET](https://img.shields.io/badge/GET-blue) /api/test                 # API test endpoint

![GET](https://img.shields.io/badge/GET-blue) /api/current_user         # Get current logged-in user

![GET](https://img.shields.io/badge/GET-blue) /api/menu-items           # Get available menu items

### Order API Routes
![POST](https://img.shields.io/badge/POST-green) /api/orders               # Create PayPal order

![POST](https://img.shields.io/badge/POST-green) /api/orders/:orderID/capture    # Capture PayPal payment

### Google Pay API Routes
![POST](https://img.shields.io/badge/POST-green) /api/orders/googlepay           # Create Google Pay order

![POST](https://img.shields.io/badge/POST-green) /api/orders/googlepay/complete  # Complete Google Pay transaction

### Payment Integration Routes
![POST](https://img.shields.io/badge/POST-green) /api/payments/paypal      # PayPal payment processing

![POST](https://img.shields.io/badge/POST-green) /api/payments/googlepay   # Google Pay payment processing

