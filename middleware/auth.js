import storage from '../services/storage.js';

export async function requireAuth(req, res, next) {
  try {
    const sessionId = req.cookies.session_id;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.'
        }
      });
    }

    const session = await storage.getSession(sessionId);

    if (!session) {
      res.clearCookie('session_id');
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session expired or invalid.'
        }
      });
    }

    const user = await storage.getUser(session.userId);

    if (!user) {
      res.clearCookie('session_id');
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User no longer exists.'
        }
      });
    }

    req.user = user;
    req.sessionId = session.id;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.'
      }
    });
  }
}
