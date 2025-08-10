const express = require('express');
const router = express.Router();

const { getAllBuses } = require('../../controllers/student/transport/transportController');

router.get('/buses', getAllBuses);

module.exports = router;