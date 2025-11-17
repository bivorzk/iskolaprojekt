const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const salt = 10;

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// ✅ Registration route
router.get('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    // Hash the password
    const hash = await bcrypt.hash(password, salt);

    // For now just log the user (later you’ll save to MongoDB)
    console.log('New user:', username);
    console.log('Hashed password:', hash);

    res.status(201).send(`User ${username} registered with hashed password`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


router.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log('Username:', username);
  console.log('Password:', password);

  bcrypt.hash(password, salt, (err, hash) => {
    if (err) {
      res.status(500).send('Error hashing password');
      return;
    }

    console.log('Hashed password:', hash);

    bcrypt.compare(password, hash, (err, result) => {
      if (err) {
        res.status(500).send('Error comparing password');
        return;
      }

      if (result) {
        console.log('mukodik');
        req.session.user = true; // Set user as logged in
        res.status(200).send(`Welcome, ${username}. Hash: ${hash}`);
      } else {
        console.log('nem mukodik');
        res.status(401).send('Authentication failed');
      }
    });
  });
});


router.post('/password-reset/:token', async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).send('Both password fields are required');
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }
    // Hash the new password
    const hash = await bcrypt.hash(newPassword, salt);

    console.log('New hashed password:', hash);
    res.status(200).send('Password has been reset successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
