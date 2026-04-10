// Shared utilities for dashboard setup
const path = require('path');

const serveDashboard = (dashboardName) => {
  return (req, res) => {
    res.status(200).sendFile(path.join(__dirname, `../../../public/dashboard/${dashboardName}/${dashboardName}.html`));
  };
};

module.exports = { serveDashboard };