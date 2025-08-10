const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @controller Get all leave requests for the logged-in teacher
 * @route GET /api/teacher/leave/history
 * @access Private (Teacher)
 */
const getLeaveHistory = asyncHandler(async (req, res) => {
  // The employeeId is retrieved from the authenticated user's session
  const { employeeId } = req.user;

  // Fetch all leave records associated with the teacher's employeeId
  const leaveHistory = await prisma.employeeLeave.findMany({
    where: {
      employee_id: employeeId,
    },
    // Order by creation date to show the most recent requests first
    orderBy: {
      created_at: 'desc',
    },
  });

  if (!leaveHistory) {
    // This case is unlikely as findMany returns an array, but it is good practice
    res.status(404);
    throw new Error('Could not find leave history for this teacher.');
  }

  res.status(200).json({
    message: 'Successfully retrieved leave history.',
    count: leaveHistory.length,
    data: leaveHistory,
  });
});

module.exports = {
  getLeaveHistory,
};