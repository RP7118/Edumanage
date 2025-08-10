const express = require('express');
const router = express.Router();

const { schoolConfiguration, getSchoolConfiguration, getAllAcademicYears, createAcademicYear } = require('../../controllers/admin/school/schoolController');

router.get('/configuration', getSchoolConfiguration);
router.post('/configuration', schoolConfiguration);
router.get('/academic-years', getAllAcademicYears);
router.post('/academic-year', createAcademicYear);

module.exports = router;