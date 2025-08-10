const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @description   Create a leave request by marking attendance as 'on_leave' for a date range.
 * @route         POST /api/student/leave/create
 * @access        Private (Student)
 */
const createLeave = asyncHandler(async (req, res) => {
  const { fromDate, toDate, reason } = req.body;
  const userId = req.user.userId;

  if (!fromDate || !toDate || !reason) {
    res.status(400);
    throw new Error('Please provide fromDate, toDate, and a reason.');
  }

  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400);
    throw new Error('Invalid date format.');
  }

  if (startDate > endDate) {
    res.status(400);
    throw new Error('The start date cannot be after the end date.');
  }

  // 1. Find the student and their current class
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: { student_id: true },
  });

  if (!student) {
    res.status(404);
    throw new Error('Student profile not found.');
  }

  const admission = await prisma.admission.findFirst({
    where: { student_id: student.student_id },
    orderBy: { admission_date: 'desc' },
    select: { class_id: true },
  });

  if (!admission) {
    res.status(404);
    throw new Error("Could not find student's class enrollment.");
  }

  // 2. Prepare an array of upsert operations for each day of leave
  const attendanceUpserts = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    attendanceUpserts.push(
      prisma.studentAttendance.upsert({
        where: {
          student_date_attendance_unique: {
            student_id: student.student_id,
            date: new Date(currentDate),
          },
        },
        update: {
          status: 'on_leave',
          remarks: reason,
        },
        create: {
          student_id: student.student_id,
          class_id: admission.class_id,
          date: new Date(currentDate),
          status: 'on_leave',
          remarks: reason,
        },
      })
    );
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 3. Execute all operations in a single transaction
  try {
    await prisma.$transaction(attendanceUpserts);
    res.status(201).json({
      message: `Successfully marked leave from ${fromDate} to ${toDate}.`,
    });
  } catch (error) {
    console.error('Failed to create leave attendance:', error);
    res.status(500);
    throw new Error('Could not process leave request.');
  }
});

module.exports = {
  createLeave,
};