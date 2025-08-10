const express = require('express');
const router = express.Router();

// Import the controller
const { getStudentAttendance } = require('../../controllers/student/attendance/attendanceController');

// Middleware to ensure the user is authenticated as a student
const { studentMiddleware } = require('../../middleware/studentMiddleware');

router.use(studentMiddleware);

router.get('/', getStudentAttendance);

module.exports = router;
