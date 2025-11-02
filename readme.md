# Project Structure

This project has been reorganized into a clean folder structure for better maintainability and organization.

## Directory Structure

```
├── src/                     # Server-side source code
│   ├── main.js             # Main application entry point
│   ├── database.js         # Database connection and user management
│   ├── api.js              # API routes and PayPal integration
│   ├── chapta.js           # CAPTCHA functionality
│   └── auth/               # Authentication modules
│       ├── email_verification.js
│       ├── password_reset.js
│       └── passwordhash.js
├── public/                 # Static files served to client
│   ├── *.html             # HTML pages (index, register, pay, etc.)
│   ├── paypal.js          # Client-side PayPal integration
│   ├── googlepay.js       # Client-side Google Pay integration
│   └── css/               # Stylesheets
│       └── register.css
├── config/                 # Configuration files
│   └── hu.json            # Hungarian language/localization
├── data/                   # Data files
│   ├── disposable_email_list.json
│   ├── Most_used_passwords.json
│   └── password_characters.json
├── docs/                   # Documentation
│   ├── readme.md          # Original readme
│   ├── Paypal_TestDetails.txt
│   ├── sourcefor_security_checks.txt
│   ├── vizsgaremek_safety.txt
│   └── npm_list.txt
├── tests/                  # Test files
│   └── register_testing.py
├── .env                    # Environment variables
├── package.json           # Node.js dependencies and scripts
└── node_modules/          # Installed dependencies
```

## Running the Application

- **Development**: `npm run dev` (uses nodemon for auto-restart)
- **Production**: `npm start`

## Key Changes Made

1. **Server code** moved to `src/` folder
2. **Authentication modules** organized in `src/auth/`
3. **Static files** (HTML, CSS, client-side JS) moved to `public/`
4. **Configuration files** moved to `config/`
5. **Data files** moved to `data/`
6. **Documentation** moved to `docs/`
7. **Test files** moved to `tests/`
8. **Updated all file paths** in require statements and static file serving
9. **Updated package.json** scripts to reflect new main file location

This structure follows Node.js best practices and makes the project more maintainable and scalable.