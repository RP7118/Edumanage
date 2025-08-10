const express = require('express');
const router = express.Router();

const { viewStudents,
    viewStudentDetails,
    getStudentMonthlyAttendance
    } = require('../../controllers/teacher/student/studentTeacherController.js');

router.get('/', viewStudents);
router.get('/:studentId', viewStudentDetails);
router.get('/:studentId/monthly-attendance', getStudentMonthlyAttendance);

module.exports = router;