const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const salt = 10;
const userPassword = 'asd';

router.use(express.urlencoded({ extended: true }));

router.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  console.log('Username:', username);
  console.log('Password:', password);

  bcrypt.hash(password, salt, (err, hash) => {
    if (err) {
      res.status(500).send('Error hashing password');
      return;
    }

    console.log('Hashed password:', hash);

    bcrypt.compare(userPassword, hash, (err, result) => {
      if (err) {
        res.status(500).send('Error comparing password');
        return;
      }

      if (result) {
        console.log('mukodik');
        res.status(200).send(`Welcome, ${username}. Hash: ${hash}`);
      } else {
        console.log('nem mukodik');
        res.status(401).send('Authentication failed');
      }
    });
  });
});

module.exports = router;
