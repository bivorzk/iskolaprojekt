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
├── badwords-list@2.0.1-4
├── bcrypt@6.0.0
├── connect-redis@9.0.0
├── crypto@1.0.1
├── dotenv@17.2.3
├── ejs@3.1.9
├── express-rate-limit@8.1.0
├── express-session@1.18.2
├── express@4.21.2
├── jsonwebtoken@9.0.2
├── mongodb@6.20.0
├── mongoose@8.18.2
├── nanoid@5.1.6
├── node-fetch@2.7.0
├── node-iplocate@2.0.1
├── nodemailer@7.0.9
├── paypal@1.0.1
├── rate-limit-redis@4.3.1
├── react@19.2.1
├── redis@5.10.0
├── serve-favicon@2.5.1
├── simple-statistics@7.8.8
└── zxcvbn@4.4.2

Dev Dependencies:
├── autoprefixer@10.4.23
├── nodemon@3.0.1
├── postcss@8.5.6
└── tailwindcss@4.1.18
```


## Directory Structure

```
├── src/                       # Server-side source code (backend)
│   ├── main.js
│   ├── database.js
│   ├── database_backup.js # same as below only its a modifed version
│   ├── database_original.js # original database.js can be rolled back if needed
│   ├── api.js
│   ├── chapta.js
│   ├── logout.js
│   ├── redis.js
│   ├── Register.jsx
│   ├── verificationStore.js
│   ├── auth/
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
│   │   └── dashboard.js
│   ├── models/
│   │   └── User.js
│   ├── Orders/
│   │   └── Order.js
│   ├── payments/
│   │   ├── googlepay.js
│   │   └── paypal.js
│   ├── profile/
│   │   └── student.js
│   ├── admin/
│   │   └── admin.js
├── public/                    # Static files served to client (Frontend)
│   ├── index.html
│   ├── register.html
│   ├── pay.html
│   ├── verify.html
│   ├── password_reset.html
│   ├── paypal.js
│   ├── googlepay.js
│   ├── css/
│   │   ├── register.css
│   │   └── tailwind.css
│   ├── dashboard/
│   │   ├── admin/
│   │   │   ├── admin_old.html # not used
│   │   │   ├── admin.css
│   │   │   ├── admin.html
│   │   │   ├── admin.js # not used
│   │   │   └── admin.jsx
│   │   └── student/
│   │       ├── student_old.html # not used
│   │       ├── student.css
│   │       ├── student.html
│   │       ├── student.js # not used
│   │       └── student.jsx
│   └── Order/
│       ├── index_old.html
│       ├── index.css
│       ├── index.html
│       └── script.js
├── config/                    # Configuration files
│   ├── database_queries.js
│   └── hu.json
├── data/                      # Data files
│   ├── disposable_email_list.json
│   ├── Most_used_passwords.json
│   ├── password_characters.json
│   └── database_test/
│       ├── Food_Items.json
│       └── menu_items.json
├── docs/                      # Documentation
│   ├── database.png
│   ├── next_implementation_list.txt
│   ├── Paypal_TestDetails.txt
│   ├── security_features.md
│   ├── sourcefor_security_checks.txt
│   ├── TODO.txt
│   └── vizsgaremek_safety.txt
├── tests/                     # Test files
│   ├── creating_test_users.js
│   ├── database_testing.js
│   ├── fake_data.py
│   ├── Jest/
│   ├── menu_items.json
│   ├── Paypal_TestConfig.txt
│   ├── register_testing.py
│   └── performance_tests/
│       └── artillery.yml
├── package.json               # Node.js dependencies and scripts
├── package-lock.json
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── readme.md                  # Project documentation

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
![GET](https://img.shields.io/badge/GET-blue)   /logout                   # Logout confirmation
![POST](https://img.shields.io/badge/POST-green) /2fa                      # Two-factor authentication

### Email Verification Routes
![POST](https://img.shields.io/badge/POST-green) /email-verification/verify-code    # Verify email code
![GET](https://img.shields.io/badge/GET-blue)   /email-verification/verify/:token  # Verify email with token

### Password Reset Routes  
![POST](https://img.shields.io/badge/POST-green) /password-reset/          # Request password reset
![GET](https://img.shields.io/badge/GET-blue)   /password-reset/:token    # Password reset form
![POST](https://img.shields.io/badge/POST-green) /password-reset/:token    # Submit new password
![POST](https://img.shields.io/badge/POST-green) /forgot-password/         # Forgot password request

### Dashboard Routes
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/               # Main dashboard
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin          # Admin dashboard page
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/student        # Student dashboard page

### Admin Dashboard API Routes
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/usercount        # Get user count
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/userlist         # Get list of users
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/stats            # Get admin statistics
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/signup-stats     # Get signup statistics
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/orders           # Get orders data
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/soldout          # Get sold out items
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/itemcount        # Get item count
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/menulist         # Get menu items list
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/stockalerts      # Get stock alerts
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/paymentstats     # Get payment statistics
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/welcome-message  # Get welcome message
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/health           # System health check
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/menuitem_export  # Export menu items
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/admin/delete_menuitem/:id  # Delete menu item

![POST](https://img.shields.io/badge/POST-green) /dashboard/admin/create_menuitem  # Create new menu item
![PUT](https://img.shields.io/badge/PUT-orange)  /dashboard/admin/menuitem/:id     # Update menu item

### Student Dashboard Routes
![GET](https://img.shields.io/badge/GET-blue)   /dashboard/student/freeze_account # Freeze student account
![POST](https://img.shields.io/badge/POST-green) /dashboard/student/parent/link    # Link parent account

### Order Management Routes
![GET](https://img.shields.io/badge/GET-blue)   /Order/                   # Order page
![GET](https://img.shields.io/badge/GET-blue)   /Order/menu_items         # Get menu items for ordering
![GET](https://img.shields.io/badge/GET-blue)   /Order/:orderID           # Get specific order details
![POST](https://img.shields.io/badge/POST-green) /Order/Order              # Create new order
![PUT](https://img.shields.io/badge/PUT-orange)  /Order/:orderID/status    # Update order status
![POST](https://img.shields.io/badge/POST-green) /Order/:orderID/capture   # Capture order payment

### Admin Management Routes
![GET](https://img.shields.io/badge/GET-blue)   /admin/changeuser         # Change user permissions

## API Routes

### General API Routes
![GET](https://img.shields.io/badge/GET-blue)   /api/test                 # API test endpoint
![GET](https://img.shields.io/badge/GET-blue)   /api/current_user         # Get current logged-in user
![GET](https://img.shields.io/badge/GET-blue)   /api/menu-items           # Get available menu items

### Order API Routes
![POST](https://img.shields.io/badge/POST-green) /api/orders               # Create PayPal order
![POST](https://img.shields.io/badge/POST-green) /api/orders/:orderID/capture    # Capture PayPal payment

### Google Pay API Routes
![POST](https://img.shields.io/badge/POST-green) /api/orders/googlepay           # Create Google Pay order
![POST](https://img.shields.io/badge/POST-green) /api/orders/googlepay/complete  # Complete Google Pay transaction

### Payment Integration Routes
![POST](https://img.shields.io/badge/POST-green) /api/payments/paypal      # PayPal payment processing
![POST](https://img.shields.io/badge/POST-green) /api/payments/googlepay   # Google Pay payment processing

