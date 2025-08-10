const { getBasicStudentProfile } = require('./basicInfoStudentController');
const { getFullStudentProfile } = require('./studentDetailController');


module.exports = {
    getBasicStudentProfile,
    getFullStudentProfile,
}