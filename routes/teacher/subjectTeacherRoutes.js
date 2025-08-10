const express = require('express');
const router = express.Router();

const { getSubjectsByTeacher,
        getSubjectDetails
 } = require('../../controllers/teacher/subject/subjectTeacherController');

router.get('/subjects', getSubjectsByTeacher);
router.get('/:subjectId', getSubjectDetails);
module.exports = router;
 
