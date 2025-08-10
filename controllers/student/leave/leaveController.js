const { getLeaveHistory } = require('./getLeaveHistoryController');
const { createLeave } = require('./newLeaveController');
const { cancelLeave } = require('./cancelLeaveController');

module.exports = {
  getLeaveHistory,
  createLeave,
  cancelLeave,
};
