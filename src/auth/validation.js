const fetch = require('node-fetch');
const passwordStrength = require('zxcvbn');

// Data imports for validation
const bannedWordsHu = require('../../config/hu.json');
const bannedWords = require('badwords-list').array;
const passwordCharacters = require('../../data/password_characters.json');
const disposableEmailList = require('../../data/disposable_email_list.json');
const commonPasswords = require('../../data/Most_used_passwords.json');

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 40;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 50;
const MIN_STRENGTH_SCORE = 3;
const CAPTCHA_SCORE_THRESHOLD = 0.5;

const USERNAME_ALLOWED_CHARS = new Set([
  ...passwordCharacters.hungarian_lowercase,
  ...passwordCharacters.hungarian_uppercase,
  ...passwordCharacters.lowercase,
  ...passwordCharacters.uppercase,
  ...passwordCharacters.digits,
  '_', '.', '-', ' '
]);

const BANNED_TERMS = [
  ...bannedWordsHu.banned.map(term => term.toLowerCase()),
  ...bannedWords.map(term => term.toLowerCase())
];

const COMMON_PASSWORDS = new Set(commonPasswords.map(password => password.toLowerCase()));
const PASSWORD_UPPERCASE_CHARS = new Set([
  ...passwordCharacters.uppercase,
  ...passwordCharacters.hungarian_uppercase
]);
const PASSWORD_DIGIT_CHARS = new Set(passwordCharacters.digits);
const PASSWORD_SPECIAL_CHARS = new Set(passwordCharacters.special);

const DANGEROUS_PASSWORD_PATTERNS = [
  '(', ')', '[', ']', '{', '}', '<', '>', '"', "'", '`', '\\', '/', '$', 'db.'
];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function containsBlacklistedTerm(value) {
  return BANNED_TERMS.some(term => term && value.includes(term));
}

function containsForbiddenPasswordPattern(password) {
  const normalized = password.toLowerCase();
  return DANGEROUS_PASSWORD_PATTERNS.some(pattern => normalized.includes(pattern));
}

function containsCharacterFromSet(value, charSet) {
  return [...charSet].some(char => value.includes(char));
}

function validateUsername(username, password) {
  const normalizedUsername = normalizeText(username);
  const normalizedPassword = normalizeText(password);

  if (!normalizedUsername) {
    return 'Username is required';
  }

  if (normalizedUsername.length < MIN_USERNAME_LENGTH || normalizedUsername.length > MAX_USERNAME_LENGTH) {
    return `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters`;
  }

  if (normalizedUsername === normalizedPassword) {
    return 'Username and password cannot be the same';
  }

  for (const char of normalizedUsername) {
    if (!USERNAME_ALLOWED_CHARS.has(char)) {
      return 'Username may only contain letters, digits, spaces, underscores, dots, or hyphens';
    }
  }

  if (containsBlacklistedTerm(normalizedUsername.toLowerCase())) {
    return 'Username contains banned words';
  }

  return null;
}


function validatePassword(password) {
  const normalizedPassword = normalizeText(password);

  if (!normalizedPassword) {
    return 'Password is required';
  }

  if (normalizedPassword.length < MIN_PASSWORD_LENGTH || normalizedPassword.length > MAX_PASSWORD_LENGTH) {
    return `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`;
  }

  if (COMMON_PASSWORDS.has(normalizedPassword.toLowerCase())) {
    return 'Password is too common, choose a stronger one';
  }

  const hasUppercase = containsCharacterFromSet(normalizedPassword, PASSWORD_UPPERCASE_CHARS);
  const hasDigit = containsCharacterFromSet(normalizedPassword, PASSWORD_DIGIT_CHARS);
  const hasSpecial = containsCharacterFromSet(normalizedPassword, PASSWORD_SPECIAL_CHARS);

  if (!hasUppercase || !hasDigit || !hasSpecial) {
    return 'Password must contain at least one uppercase letter, one digit, and one special character';
  }

  if (containsForbiddenPasswordPattern(normalizedPassword)) {
    return 'Please avoid using brackets, quotes, slashes, or database-like patterns in your password';
  }

  if (containsBlacklistedTerm(normalizedPassword.toLowerCase())) {
    return 'Password contains banned words';
  }

  const strengthResult = passwordStrength(normalizedPassword);
  const warning = strengthResult.feedback.warning ? ` (${strengthResult.feedback.warning})` : '';

  if (strengthResult.score < MIN_STRENGTH_SCORE) {
    return `Password is too weak, choose a stronger one${warning}. It would take ${strengthResult.guesses.toLocaleString()} guesses to crack it.`;
  }

  return null;
}


function validateEmail(email) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  const [localPart, domain] = normalizedEmail.split('@');

  if (!localPart || !domain) {
    return 'Invalid email address';
  }

  if (disposableEmailList.includes(domain)) {
    return 'This type of email is not allowed, please use another email';
  }

  return null;
}


async function verifyCaptcha(captchaResponse, secretKey) {
  const normalizedResponse = normalizeText(captchaResponse);
  const normalizedSecret = normalizeText(secretKey);

  if (!normalizedResponse) {
    return { success: false, error: 'Please complete the CAPTCHA verification' };
  }

  if (!normalizedSecret) {
    return { success: false, error: 'CAPTCHA configuration error' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: normalizedSecret,
        response: normalizedResponse
      })
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: 'CAPTCHA verification failed',
        details: data['error-codes'] || []
      };
    }

    if (typeof data.score !== 'number' || data.score <= CAPTCHA_SCORE_THRESHOLD) {
      return { success: false, error: 'CAPTCHA verification failed' };
    }

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