const asyncHandler =require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @description   Get all leave requests by grouping 'on_leave' attendance records.
 * @route         GET /api/student/leave/history
 * @access        Private (Student)
 */
const getLeaveHistory = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: { student_id: true },
  });

  if (!student) {
    res.status(404);
    throw new Error('Student profile not found.');
  }

  // 1. Fetch all individual 'on_leave' days, sorted by date
  const leaveDays = await prisma.studentAttendance.findMany({
    where: {
      student_id: student.student_id,
      status: 'on_leave',
    },
    orderBy: {
      date: 'asc',
    },
  });

  if (leaveDays.length === 0) {
    return res.status(200).json([]);
  }

  // 2. Group consecutive days into leave periods
  const leavePeriods = [];
  let currentPeriod = null;

  for (const day of leaveDays) {
    const dayDate = new Date(day.date);

    if (currentPeriod === null) {
      // Start the first period
      currentPeriod = {
        id: day.attendance_id,
        fromDate: dayDate,
        toDate: dayDate,
        reason: day.remarks || '',
      };
    } else {
      const nextDay = new Date(currentPeriod.toDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Check if the current day is consecutive and the reason is the same
      if (dayDate.getTime() === nextDay.getTime() && day.remarks === currentPeriod.reason) {
        // Extend the current period
        currentPeriod.toDate = dayDate;
      } else {
        // End the current period and start a new one
        leavePeriods.push(currentPeriod);
        currentPeriod = {
          id: day.attendance_id,
          fromDate: dayDate,
          toDate: dayDate,
          reason: day.remarks || '',
        };
      }
    }
  }
  // Add the last processed period
  if (currentPeriod) {
    leavePeriods.push(currentPeriod);
  }
  
  // 3. Format the dates for the final response
  const formattedPeriods = leavePeriods.map(p => ({
    ...p,
    fromDate: p.fromDate.toISOString().split('T')[0],
    toDate: p.toDate.toISOString().split('T')[0],
  }));


  res.status(200).json(formattedPeriods);
});


module.exports = {
  getLeaveHistory,
};