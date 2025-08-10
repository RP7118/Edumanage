const {
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
} = require("../../controllers/admin/employee/employeeController");
const express = require("express");
const router = express.Router();

// Employee Attendance Operations
router.get("/attendance", getAttendanceRecords);
router.post("/attendance/mark-single", markSingleAttendance);
router.post("/attendance/mark-bulk", markBulkAttendance);
router.post("/attendance/sync-biometric", syncBiometricData);
router.get("/attendance/:employeeId", getEmployeeAttendanceByDateRange);
router.get("/attendance/:employeeId/monthly", getEmployeeMonthlyAttendance);

// Employee Leave Operations
router.get("/leaves", getAllLeaveRequests);
router.get("/leaves/:employeeId", getEmployeeLeaveRecords);
router.post("/leaves", createLeaveRequest);
router.put("/leaves/:leaveId/status", updateLeaveStatus);

// Attendance precedes Employee Operations because of id routes are dynamic and need to be defined after the static ones
// Employee Operations
router.post("/create-employee", createEmployee);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", editEmployee);
router.delete("/:id", deleteEmployee);


module.exports = router;
