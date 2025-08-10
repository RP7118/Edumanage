const {teacherLogin, verifyTeacherCookie, logoutTeacher} = require('./teacherController');
const { studentLogin, logoutStudent, verifyStudentCookie } = require('./studentController');

module.exports = {
    teacherLogin,
    verifyTeacherCookie,
    logoutTeacher,
    studentLogin,
    logoutStudent,
    verifyStudentCookie
};