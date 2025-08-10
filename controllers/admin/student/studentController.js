const { createStudent } = require('./newStudentController');
const { getStudents } = require('./getStudentsController');
const { getStudentById } = require('./getStudentByIdController');
const { editStudent } = require('./editStudentController');
const { getStudentsByClass } = require('./getStudentsByClassController');
const { batchUpdateRollNumbers } = require('./batchUpdateRollNumbersController');
const { getStudentCredentials,
  setStudentCredentials } = require('./studentCredentialController');
const { promoteStudents } = require('./promoteStudentController');
const { getStudentAttendance,
    upsertStudentAttendance } = require('./studentAttendanceController');

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  editStudent,
  getStudentsByClass,
  batchUpdateRollNumbers,
  getStudentCredentials,
  setStudentCredentials,
  promoteStudents,
  getStudentAttendance,
  upsertStudentAttendance
};
