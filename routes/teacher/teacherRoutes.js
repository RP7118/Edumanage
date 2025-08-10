const express = require('express');
const router = express.Router();

const teacherMiddleware = require('../../middleware/teacherMiddleware');

const studentTeacherRoutes = require('./studentTeacherRoutes.js');
const classTeacherRoutes = require('./classTeacherRoutes.js')
const subjectTeacherRoutes = require('./subjectTeacherRoutes.js');
const profileTeacherRoutes = require('./profileTeacherRoutes.js');
const leaveTeacherRoutes = require('./leaveTeacherRoutes.js');

router.use(teacherMiddleware);

router.use('/student', studentTeacherRoutes);
router.use('/class', classTeacherRoutes);
router.use('/profile', profileTeacherRoutes);
router.use('/subject', subjectTeacherRoutes);
router.use('/leave', leaveTeacherRoutes);


module.exports = router;