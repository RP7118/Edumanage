const { teacherLogin,
    verifyTeacherCookie,
    logoutTeacher } = require('../../controllers/auth/teacherController');

const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/auth/teacher/login
 * @desc    Logs in a teacher and sets a JWT cookie.
 * @access  Public
 */
router.post('/login', teacherLogin);

/**
 * @route   GET /api/auth/teacher/verify
 * @desc    Verifies the logged-in teacher's session using the JWT cookie.
 * @access  Private (requires a valid JWT cookie)
 */
router.get('/verify', verifyTeacherCookie);

/**
 * @route   POST /api/auth/teacher/logout
 * @desc    Logs out the teacher by clearing the JWT cookie.
 * @access  Private (requires a valid JWT cookie)
 */
router.post('/logout', logoutTeacher);


module.exports = router;