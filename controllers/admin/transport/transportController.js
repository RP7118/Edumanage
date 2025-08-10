const { getBusById, getAllBuses } = require('./getBusController');
const { newBus } = require('./newBusController');
const { updateBus } = require('./editBusController');
const { deleteBus } = require('./deleteBusController');


module.exports = {
    getBusById,
    getAllBuses,
    newBus,
    updateBus,
    deleteBus
};