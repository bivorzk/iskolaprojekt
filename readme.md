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
├── src/                     # Server-side source code (backend)
│   ├── main.js
│   ├── database.js
│   ├── api.js
│   ├── chapta.js
│   ├── auth/
│   │   ├── 2fa.js
│   │   ├── email_verification.js
│   │   ├── password_reset.js
│   │   └── passwordhash.js
│   ├── dashboard/
│   │   └── dashboard.js
│   ├── payments/
│   │   ├── googlepay.js
│   │   └── paypal.js
│   ├── profile/
│   │   ├── student.js
│   │   └── parent.js
├── public/                  # Static files served to client (Frontend should be here)
│   ├── index.html
│   ├── register.html
│   ├── pay.html
│   ├── verify.html
│   ├── password_reset.html
│   ├── paypal.js
│   ├── googlepay.js
│   └── css/
│       └── register.css
├── config/                  # Configuration files
│   ├── database_queries.js     # Database tables are created here expect Users table
│   └── hu.json
├── data/                    # Data files
│   ├── disposable_email_list.json
│   ├── Most_used_passwords.json
│   └── password_characters.json
├── docs/                    # Documentation
│   ├── Paypal_TestDetails.txt
│   ├── sourcefor_security_checks.txt
│   ├── vizsgaremek_safety.txt
├── tests/                   # Test files
│   ├── creating_test_users.js
│   ├── Paypal_TestConfig.txt
│   └── register_testing.py
├── package.json             # Node.js dependencies and scripts
└── readme.md                # Project documentation
```