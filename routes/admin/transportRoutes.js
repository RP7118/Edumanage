const express = require('express');
const router = express.Router();

const { getAllBuses, getBusById, newBus, updateBus, deleteBus } = require('../../controllers/admin/transport/transportController');

router.get('/buses', getAllBuses); // Get all buses
router.post('/buses', newBus); // Add a new bus

router.get('/buses/:id', getBusById); // Get a single bus by ID
router.put('/buses/:id', updateBus); // Update a bus by ID
router.delete('/buses/:id', deleteBus); // Delete a bus by ID

module.exports = router;