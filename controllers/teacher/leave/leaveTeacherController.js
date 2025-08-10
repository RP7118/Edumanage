const { getLeaveHistory } = require('./getLeaveController');
const { applyForLeave } = require('./newLeaveController');

module.exports = {
    getLeaveHistory,
    applyForLeave,
}