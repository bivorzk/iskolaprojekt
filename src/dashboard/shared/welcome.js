// Shared welcome message handler for all dashboards
const getWelcomeMessage = async (req, res) => {
  try {
    const username = req.session.user.username;
    res.status(202).json({ message: `Welcome, ${username}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getWelcomeMessage };