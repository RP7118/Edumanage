const express = require('express');
const router = express.Router();

const {
    getBasicStudentProfile,
    getFullStudentProfile,
} = require('../../controllers/student/profile/profileStudentController');

const { studentMiddleware } = require('../../middleware/studentMiddleware');

router.use(studentMiddleware);

// Define routes
router.get('/basic-info', getBasicStudentProfile);
router.get('/full-profile', getFullStudentProfile);

module.exports = router;