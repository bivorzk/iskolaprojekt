const path = require('path');

describe('requireAdmin middleware', () => {
  let requireAdmin;
  let req;
  let res;
  let next;

  beforeEach(() => {
    requireAdmin = require('../../../src/dashboard/middleware/auth-middleware').requireAdmin;

    req = {
      session: {}
    };

    res = {
      sendFile: jest.fn()
    };

    next = jest.fn();
  });

  test('should block if no session user', () => {
    requireAdmin(req, res, next);

    expect(res.sendFile).toHaveBeenCalledWith(
      path.join(process.cwd(), 'public/no_perm/index.html')
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should block if not admin', () => {
    req.session.user = {
      IsLoggedIn: true,
      usertype: 'student'
    };

    requireAdmin(req, res, next);

    expect(res.sendFile).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('should allow admin user', () => {
    req.session.user = {
      IsLoggedIn: true,
      usertype: 'admin'
    };

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.sendFile).not.toHaveBeenCalled();
  });
});