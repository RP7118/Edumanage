const {createSubject, getEnrolledStudents, enrollStudents, getAllSubjects, getSubjectById, deleteStudentFromSubject, editSubject, deleteSubject } = require('../../controllers/admin/subject/subjectController');
const express = require('express');
const router = express.Router();


// Subject Operations
router.get('/', getAllSubjects);
router.post('/create-subject', createSubject);
router.get('/:id', getSubjectById);
router.put('/:id', editSubject);
router.delete('/:id', deleteSubject);

// Student Operations for a specific subject
router.get('/:subjectId/students', getEnrolledStudents);
router.post('/:subjectId/students', enrollStudents);
router.delete('/:subjectId/student/:studentId', deleteStudentFromSubject);

module.exports = router;