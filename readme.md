# npm list

Jelenleg a projekt ezeket a node modulokat tartalmazza ha valami nem mukodik akkor a verzioval egyutt toltsetek le 

- @google-cloud/recaptcha-enterprise@6.3.0  
- @paypal/paypal-server-sdk@1.1.0  
- badwords-list@2.0.1-4  
- bcrypt@6.0.0  
- dotenv@17.2.3  
- ejs@3.1.10  
- express-rate-limit@8.1.0  
- express@4.21.2  
- jsonwebtoken@9.0.2  
- mongodb@6.20.0  
- mongoose@8.18.2  
- node-fetch@2.7.0  
- nodemailer@7.0.9  
- nodemon@3.1.0  
- paypal@1.0.1  
- zxcvbn@4.4.2  

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

