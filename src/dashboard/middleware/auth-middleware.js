const path = require('path');

function checkAuth(req, res, next, allowedTypes) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
  if (!allowedTypes.includes(req.session.user.usertype)) {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
  next();
}

function requireAdmin(req, res, next) {
  checkAuth(req, res, next, ['admin']);
}

function requireStudent(req, res, next) {
  checkAuth(req, res, next, ['student', 'admin']);
}

function requireEditor(req, res, next) {
  checkAuth(req, res, next, ['editor', 'admin']);
}

function requireParentAuth(req, res, next) {
  checkAuth(req, res, next, ['parent', 'admin']);
}

module.exports = {
  requireAdmin,
  requireStudent,
  requireParentAuth,
  requireEditor
};