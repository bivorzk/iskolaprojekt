const path = require('path');



function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
  if (req.session.user.usertype !== 'admin') {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
  next();
}


function requireStudent(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
  // Allow both students and admins to access student routes
  if (req.session.user.usertype === 'student' || req.session.user.usertype === 'admin') {
    next();
  } else {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
}

function requireParentAuth(req, res, next) {
  if (!req.session.user || !req.session.user.IsLoggedIn) {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
  if (req.session.user.usertype !== 'parent' && req.session.user.usertype !== 'admin') {
    return res.sendFile(path.join(process.cwd(), 'public/no_perm/index.html'));
  }
  next();
}

module.exports = {
  requireAdmin,
  requireStudent,
  requireParentAuth
};