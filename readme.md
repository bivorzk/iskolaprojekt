## Starting the app
```
node src/main.js
npm start this is should be used mainly

```

## Gitignore file tartalma:

```
.vscode/settings.json
node_modules/faker
config/exports
config/sql.js
config/users.sql
node_modules/react
```

## npm list


These are the current node modules that are needed to run the application

```
@google-cloud/recaptcha-enterprise@6.3.0
@paypal/paypal-server-sdk@1.1.0
badwords-list@2.0.1-4
bcrypt@6.0.0
crypto@1.0.1
dotenv@17.2.3
ejs@3.1.10
express-rate-limit@8.1.0
express-session@1.18.2
express@4.21.2
jsonwebtoken@9.0.2
mongodb@6.20.0
mongoose@8.18.2
nanoid@5.1.6
node-fetch@2.7.0
nodemailer@7.0.9
nodemon@3.1.0
paypal@1.0.1
react@19.2.1
simple-statistics@7.8.8
zxcvbn@4.4.2
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
├── public/                    # Static files served to client (Frontend)
│   ├── index.html
│   ├── register.html
│   ├── pay.html
│   ├── verify.html
│   ├── password_reset.html
│   ├── paypal.js
│   ├── googlepay.js
│   ├── css/
│   │   └── register.css
│   ├── dashboard/
│   │   ├── admin/
│   │   │   ├── admin.css
│   │   │   ├── admin.html
│   │   │   └── admin.js
│   │   └── student/
│   │       ├── student.css
│   │       ├── student.html
│   │       └── student.js
│   └── Order/
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
│   ├── features_to_implement.txt
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
│   └── register_testing.py
├── package.json               # Node.js dependencies and scripts
├── package-lock.json
└── readme.md                  # Project documentation
```