const { schoolConfiguration } = require('./schoolInformationController');
const { getSchoolConfiguration } = require('./getSchoolInformationController');
const { getAllAcademicYears,
  createAcademicYear } = require('./AcademicYearController');


module.exports = {
  schoolConfiguration,
  getSchoolConfiguration,
  getAllAcademicYears,
  createAcademicYear
};