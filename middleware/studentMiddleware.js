const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to authenticate and attach student user object from JWT in cookies.
 * - Reads the "jwt" cookie.
 * - Verifies the token using utils/jwt.js verifyToken function.
 * - If valid, attaches user object to req.user with payload from token.
 * - If invalid or missing, responds with 401 Unauthorized.
 */
const studentMiddleware = (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: 'Authentication token (jwt) missing.' });
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      studentId: decoded.studentId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

module.exports ={ studentMiddleware};