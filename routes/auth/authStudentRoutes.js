const {
    studentLogin,
    verifyStudentCookie,
    logoutStudent
} = require('../../controllers/auth/authController');

const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/auth/student/login
 * @desc    Logs in a student and sets a JWT cookie.
 * @access  Public
 */
router.post('/login', studentLogin);

/**
 * @route   GET /api/auth/student/verify
 * @desc    Verifies the logged-in student's session using the JWT cookie.
 * @access  Private (requires a valid JWT cookie)
 */
router.get('/verify', verifyStudentCookie);

/**
 * @route   POST /api/auth/student/logout
 * @desc    Logs out the student by clearing the JWT cookie.
 * @access  Private (requires a valid JWT cookie)
 */
router.post('/logout', logoutStudent);

module.exports = router;