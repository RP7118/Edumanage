const { viewStudents } = require('./viewStudentController.js');
const { viewStudentDetails } = require('./getStudentByIdController.js');
const { getStudentMonthlyAttendance } = require('./getStudentMonthlyAttendanceController.js');

module.exports = {
    viewStudents,
    viewStudentDetails,
    getStudentMonthlyAttendance,    
}