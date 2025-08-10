const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @description   Cancel a future leave period. Past or ongoing leaves cannot be cancelled.
 * @route         DELETE /api/student/leave/cancel/:id
 * @access        Private (Student)
 */
const cancelLeave = asyncHandler(async (req, res) => {
  const { id } = req.params; // This is the attendance_id of the first day of the leave period
  const userId = req.user.userId;

  // 1. Find the student record for the logged-in user
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: { student_id: true },
  });

  if (!student) {
    res.status(404);
    throw new Error('Student profile not found.');
  }

  // 2. Find the initial attendance record that marks the start of the leave
  const initialLeaveDay = await prisma.studentAttendance.findUnique({
    where: { attendance_id: id },
  });

  if (!initialLeaveDay) {
    res.status(404);
    throw new Error('Leave record not found.');
  }

  // 3. Authorization: Ensure the student is cancelling their own leave
  if (initialLeaveDay.student_id !== student.student_id) {
    res.status(403);
    throw new Error('You are not authorized to cancel this leave request.');
  }

  if (initialLeaveDay.status !== 'on_leave') {
    res.status(400);
    throw new Error('This record is not a leave record and cannot be cancelled.');
  }

  // 4. ✨ New Validation: Check if the leave is in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight to compare dates only

  const leaveStartDate = new Date(initialLeaveDay.date);

  if (leaveStartDate <= today) {
    res.status(400);
    throw new Error('Past or ongoing leave requests cannot be cancelled.');
  }

  // 5. Identify all consecutive days belonging to this leave period
  const leaveReason = initialLeaveDay.remarks;
  const allLeaveDaysForReason = await prisma.studentAttendance.findMany({
    where: {
      student_id: student.student_id,
      status: 'on_leave',
      remarks: leaveReason,
      date: {
        gte: leaveStartDate, // Optimization: Only search from the leave start date
      }
    },
    orderBy: {
      date: 'asc',
    },
  });

  const leavePeriodIds = [];
  let foundPeriod = false;

  for (const day of allLeaveDaysForReason) {
    if (day.attendance_id === id) {
      foundPeriod = true;
    }
    if (foundPeriod) {
      leavePeriodIds.push(day.attendance_id);
      // Check for discontinuity
      const lastDate = new Date(day.date);
      const nextIndex = allLeaveDaysForReason.indexOf(day) + 1;
      if (nextIndex < allLeaveDaysForReason.length) {
        const nextDate = new Date(allLeaveDaysForReason[nextIndex].date);
        const expectedNextDate = new Date(lastDate);
        expectedNextDate.setDate(expectedNextDate.getDate() + 1);
        if (nextDate.getTime() !== expectedNextDate.getTime()) {
          break; // Break if the next day is not consecutive
        }
      }
    }
  }
  
  if (leavePeriodIds.length === 0) {
      res.status(404);
      throw new Error("Could not identify the full leave period to cancel.");
  }

  // 6. Update all identified leave records back to 'absent'
  await prisma.studentAttendance.updateMany({
    where: {
      attendance_id: {
        in: leavePeriodIds,
      },
    },
    data: {
      status: 'absent',
      remarks: 'Leave Cancelled by Student',
    },
  });

  res.status(200).json({ message: 'Leave request cancelled successfully.' });
});

module.exports = {
  cancelLeave,
};