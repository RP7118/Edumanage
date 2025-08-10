const express = require('express');
const router = express.Router();


const { getClassDetails,
        getTeacherClasses,
        getClassAttendance,
        getStudentsByClass,
        submitAttendance,
 } = require('../../controllers/teacher/class/classTeacherController');



router.get('/', getClassDetails);
router.get('/classes', getTeacherClasses);
router.get('/attendance', getClassAttendance);
router.get('/students', getStudentsByClass);
router.post('/attendance', submitAttendance);

module.exports = router;