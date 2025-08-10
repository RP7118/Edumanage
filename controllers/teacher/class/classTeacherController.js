const { getClassDetails } = require('./classDetailsController');
const { getTeacherClasses } = require('./getClassListController');
const { getClassAttendance } = require('./getClassAttendanceController');
const { getStudentsByClass,
        submitAttendance, } = require('./takeAttendanceController');

module.exports = {
    getClassDetails,
    getTeacherClasses,
    getClassAttendance,
    getStudentsByClass,
    submitAttendance
};