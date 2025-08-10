const { createEmployee } = require("./newEmployeeController");
const { getEmployeeById } = require("./getEmployeeByIdController");
const { getEmployees } = require("./getEmployeesController");
const { deleteEmployee } = require("./deleteEmployeeController");
const { editEmployee } = require("./editEmployeeController");
const {
  getAttendanceRecords,
  markSingleAttendance,
  markBulkAttendance,
  syncBiometricData,
  getEmployeeAttendanceByDateRange,
  getEmployeeMonthlyAttendance,
} = require("./employeeAttendanceController");
const {
  getAllLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  getEmployeeLeaveRecords
} = require("./employeeLeaveController");

module.exports = {
  createEmployee,
  getEmployeeById,
  getEmployees,
  deleteEmployee,
  editEmployee,
  getAttendanceRecords,
  markSingleAttendance,
  markBulkAttendance,
  syncBiometricData,
  getAllLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  getEmployeeAttendanceByDateRange,
  getEmployeeMonthlyAttendance,
  getEmployeeLeaveRecords
};
