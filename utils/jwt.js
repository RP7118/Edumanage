const jwt = require('jsonwebtoken');

/**
 * Generates a JWT.
 * @param {string} userId - The user's ID to include in the payload.
 * @param {string} employeeId - The employee's ID to include in the payload.
 * @param {string} role - The user's role to include in the payload.
 * @returns {string} The generated JSON Web Token.
 */
const generateToken = (userId, employeeId, role) => {
  const payload = {
    userId,
    employeeId,
    role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

/**
 * Verifies a JWT and returns the decoded payload if valid.
 * Throws an error if invalid or expired.
 * @param {string} token - The JWT to verify.
 * @returns {Object} Decoded payload.
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};