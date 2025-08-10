const express = require('express');
const router = express.Router();

// Middleware for student routes
const {studentMiddleware} = require('../../middleware/studentMiddleware');

// Student Routes
const profileStudentRoutes = require('./profileStudentRoutes');
const attendanceStudentRoutes = require('./attendanceStudentRoutes');
const transportStudentRoutes = require('./transportStudentRoutes');
const leaveStudentRoutes = require('./leaveStudentRoutes');

router.use(studentMiddleware);

router.use('/profile', profileStudentRoutes);
router.use('/attendance', attendanceStudentRoutes);
router.use('/leave', leaveStudentRoutes);
router.use('/transport', transportStudentRoutes);


module.exports = router;