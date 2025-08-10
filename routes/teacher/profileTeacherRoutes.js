const express = require('express');
const router = express.Router();

const { getProfileController } = require('../..//controllers/teacher/profile/profileTeacherController');

router.get('/', getProfileController);

module.exports = router;