const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();
const asyncHandler = require('express-async-handler');

// -------------------------------------------------------------
// SECTION 1: Get Students & Existing Attendance
// -------------------------------------------------------------

/**
 * @route GET /api/teacher/attendance/students
 * @description Fetches students for a specific class and their attendance for a given date.
 * @access Private (Teacher only)
 * @queryparams {string} classId - The ID of the class.
 * @queryparams {string} date - The date for attendance (e.g., 'YYYY-MM-DD').
 */
const getStudentsByClass = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;
  const { classId, date } = req.query;

  if (!classId || !date) {
    res.status(400);
    throw new Error('Class ID and date are required query parameters.');
  }

  // 1. Verify teacher is the class teacher for the requested class
  const assignedClass = await prisma.class.findFirst({
    where: {
      class_id: classId,
      class_teacher_id: employeeId,
    },
  });

  if (!assignedClass) {
    res.status(403);
    throw new Error('Forbidden: You are not authorized to take attendance for this class.');
  }

  // 2. Fetch all active students in the class
  const students = await prisma.admission.findMany({
    where: {
      class_id: classId,
      student: {
        status: 'active',
      },
    },
    select: {
      roll_number: true,
      student: {
        select: {
          student_id: true,
          first_name: true,
          last_name: true,
          profile_avatar_url: true,
        },
      },
    },
    orderBy: {
      student: {
        first_name: 'asc',
      },
    },
  });

  const formattedStudents = students.map(({ roll_number, student }) => ({
    studentId: student.student_id,
    rollNo: roll_number,
    name: `${student.first_name} ${student.last_name || ''}`.trim(),
    avatarUrl: student.profile_avatar_url,
  }));

  // 3. Fetch existing attendance records for the given date
  const attendanceDate = new Date(date);
  const existingAttendance = await prisma.studentAttendance.findMany({
    where: {
      class_id: classId,
      date: attendanceDate,
    },
  });
  
  // Format attendance into a quick-lookup map { studentId: status }
  const attendanceMap = existingAttendance.reduce((acc, record) => {
    acc[record.student_id] = record.status;
    return acc;
  }, {});


  res.status(200).json({
    students: formattedStudents,
    attendanceRecords: attendanceMap,
  });
});

// -------------------------------------------------------------
// SECTION 2: Submit or Update Attendance
// -------------------------------------------------------------

/**
 * @route POST /api/teacher/attendance/submit
 * @description Submits or updates attendance for multiple students.
 * @access Private (Teacher only)
 * @body {string} classId - The ID of the class.
 * @body {string} date - The date of attendance (e.g., 'YYYY-MM-DD').
 * @body {Array<Object>} attendanceData - Array of { studentId, status }.
 */
const submitAttendance = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;
  const { classId, date, attendanceData } = req.body;

  if (!classId || !date || !Array.isArray(attendanceData)) {
    res.status(400);
    throw new Error('Missing required fields: classId, date, and attendanceData array.');
  }

  // 1. Verify teacher's authority over the class
  const assignedClass = await prisma.class.findFirst({
    where: {
      class_id: classId,
      class_teacher_id: employeeId,
    },
  });

  if (!assignedClass) {
    res.status(403);
    throw new Error('Forbidden: You are not authorized to modify attendance for this class.');
  }

  const attendanceDate = new Date(date);
  
  // 2. Prepare transaction for upserting attendance records
  const upsertOperations = attendanceData.map(({ studentId, status }) => {
    // Basic validation for status enum
    const validStatuses = ['present', 'absent', 'late', 'half_day', 'on_leave'];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status "${status}" for student ID ${studentId}.`);
    }

    return prisma.studentAttendance.upsert({
      where: {
        student_date_attendance_unique: {
          student_id: studentId,
          date: attendanceDate,
        },
      },
      update: {
        status: status,
      },
      create: {
        student_id: studentId,
        class_id: classId,
        date: attendanceDate,
        status: status,
      },
    });
  });

  // 3. Execute all operations in a single transaction
  try {
    await prisma.$transaction(upsertOperations);
    res.status(200).json({ message: 'Attendance has been submitted successfully.' });
  } catch (error) {
    console.error("Attendance submission failed:", error);
    res.status(500);
    throw new Error('A database error occurred while submitting attendance.');
  }
});


module.exports = {
  getStudentsByClass,
  submitAttendance,
};