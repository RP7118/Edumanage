const { createSubject } = require('./newSubjectController');
const { getEnrolledStudents } = require('./getEnrolledStudentController');
const { enrollStudents } = require('./EnrollStudentsController');
const { getAllSubjects } = require('./getAllSubjectsController');
const { deleteSubject } = require('./deleteSubjectController');
const { getSubjectById } = require('./getSubjectByIdController');
const { deleteStudentFromSubject } = require('./deleteStudentFromSubjectController');
const { editSubject } = require('./editSubjectController');

module.exports = { 
    createSubject,
    getEnrolledStudents,
    enrollStudents,
    getAllSubjects,
    editSubject,
    deleteSubject,
    getSubjectById,
    deleteStudentFromSubject
 };