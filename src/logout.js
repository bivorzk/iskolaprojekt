const express = require('express');
const router = express.Router();

// Logout route
router.post('/logout', (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: 'No active session found' });
    }

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Could not log out, please try again' });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid'); // Default session cookie name
      
      console.log('User logged out successfully');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// GET route for logout (alternative method)
router.get('/logout', (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.redirect('/login');
    }

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send('Could not log out, please try again');
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      
      console.log('User logged out successfully');
      res.redirect('/login');
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).send('Server error during logout');
  }
});

module.exports = router;