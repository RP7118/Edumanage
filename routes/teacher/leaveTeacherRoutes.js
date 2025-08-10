const express = require('express');
const router = express.Router();


const { getLeaveHistory,
    applyForLeave } = require('../../controllers/teacher/leave/leaveTeacherController')


router.get('/history', getLeaveHistory);
router.post('/apply', applyForLeave);

module.exports = router;