const express = require('express');
const router = express.Router();

//Middleware
const { studentMiddleware } = require('../../middleware/studentMiddleware');

// Controllers
const { getLeaveHistory,
        createLeave,
        cancelLeave } = require('../../controllers/student/leave/leaveController');


router.use(studentMiddleware);

router.get('/history', getLeaveHistory);
router.post('/create', createLeave);
router.delete('/cancel/:id', cancelLeave);

module.exports = router;