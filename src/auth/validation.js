const passwordStrength = require('zxcvbn');

// Data imports for validation
const banned_words_hu = require('../../config/hu.json');
const banned_words = require('badwords-list').array;
const password_characters = require('../../data/password_characters.json');
const disposable_email_list = require('../../data/disposable_email_list.json');
const banned_passwords = require('../../data/Most_used_passwords.json');


function validateUsername(username, password) {
  // Length validation
  if (username.length < 3 || username.length > 40) {
    return 'Username must be between 3 and 40 characters';
  }

  // Username cannot equal password
  if (username === password) {
    return 'Username and password cannot be the same';
  }

  // Character validation - allow letters, digits, and specific special characters
  const allowedChars = [
    ...password_characters.hungarian_lowercase,
    ...password_characters.hungarian_uppercase,
    ...password_characters.lowercase,
    ...password_characters.uppercase,
    ...password_characters.digits,
    '_', '.', '-', ' '
  ];

  for (const char of username) {
    if (!allowedChars.includes(char)) {
      return 'Username has to be made up of letters and digits special characters are not allowed for safety reasons';
    }
  }

  // Banned words validation
  for (const word of Object.values(banned_words_hu)) {
    if (username.toLowerCase().includes(word)) {
      return 'Username contains banned words';
    }
  }

  for (const word of banned_words) {
    if (username.toLowerCase().includes(word)) {
      return 'Username contains banned words';
    }
  }

  return null;
}


function validatePassword(password) {
  // Length validation
  if (password.length < 8 || password.length > 50) {
    return 'Password must be between 8 and 50 characters';
  }

  // Banned passwords check
  for (const bannedPassword of banned_passwords) {
    if (password.toLowerCase() === bannedPassword) {
      return 'Password is too common, choose a stronger one';
    }
  }

  // Character requirements validation
  const hasUppercase = [...password_characters.uppercase, ...password_characters.hungarian_uppercase]
    .some(char => password.includes(char));
  const hasDigit = Array.from(password_characters.digits)
    .some(char => password.includes(char));
  const hasSpecial = Array.from(password_characters.special)
    .some(char => password.includes(char));

  if (!hasUppercase || !hasDigit || !hasSpecial) {
    return 'Password must contain at least one uppercase letter, one digit, and one special character';
  }

  // Password strength check
  const strengthResult = passwordStrength(password);
  if (strengthResult.score <= 3) {
    return `Password is too weak, choose a stronger one ${strengthResult.feedback.warning} ${strengthResult.guesses}`;
  }

  // Dangerous characters check
  const dangerousPatterns = [
    '(', ')', '[', ']', '{', '}', '<', '>', '"', "'", '`', '\\', '/', '$'
  ];
  
  const hasDangerousChars = dangerousPatterns.some(char => password.includes(char)) ||
    password.includes('db.') || password.includes('DB.');

  if (hasDangerousChars) {
    return 'Please consider avoiding using matching pairs of brackets or quotes in your password, as they can sometimes cause issues during input or processing.';
  }

  // Banned words validation
  for (const word of Object.values(banned_words_hu)) {
    if (password.toLowerCase().includes(word)) {
      return 'Password contains banned words';
    }
  }

  for (const word of banned_words) {
    if (password.toLowerCase().includes(word)) {
      return 'Password contains banned words';
    }
  }

  return null;
}


function validateEmail(email) {
  if (disposable_email_list.includes(email)) {
    return 'This type of email is not allowed please use another email';
  }
  return null;
}


async function verifyCaptcha(captchaResponse, secretKey) {
  if (!captchaResponse) {
    return { success: false, error: 'Please complete the CAPTCHA verification' };
  }

  if (!secretKey) {
    return { success: false, error: 'CAPTCHA configuration error' };
  }

  try {
    console.log('Starting reCAPTCHA verification...');
    
    const realFetch = fetch.default || fetch;
    const response = await realFetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: captchaResponse
      })
    });

    const data = await response.json();
    console.log('reCAPTCHA verification result:', data);
    
    if (!data.success) {
      console.log('reCAPTCHA verification failed:', data['error-codes']);
      return { 
        success: false, 
        error: 'CAPTCHA verification failed', 
        details: data['error-codes'] 
      };
    }

    // For tests set 0.5 to 0.1 to get successful registration more easily
    if (data.score <= 0.5) {
      console.log('CAPTCHA score too low:', data.score);
      return { success: false, error: 'CAPTCHA verification failed' };
    }

    console.log('reCAPTCHA verification SUCCESS, score:', data.score);
    return { success: true, score: data.score };

  } catch (captchaError) {
    console.error('reCAPTCHA verification error:', captchaError);
    return { success: false, error: 'CAPTCHA verification service error' };
  }
}

module.exports = {
  validateUsername,
  validatePassword,
  validateEmail,
  verifyCaptcha
};