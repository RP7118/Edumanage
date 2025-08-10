const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @description Get a student's monthly attendance
 * @route GET /api/teacher/class/student-attendance
 * @access Private (Teacher)
 */
const getStudentMonthlyAttendance = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.query.studentId;
  const { month, year } = req.query;

  if (!studentId || !month || !year) {
    return res.status(400).json({ message: 'studentId, month, and year are required' });
  }

  const monthInt = parseInt(month, 10);
  const yearInt = parseInt(year, 10);

  if (isNaN(monthInt) || isNaN(yearInt) || monthInt < 1 || monthInt > 12) {
    return res.status(400).json({ message: 'Invalid month or year' });
  }

  // Calculate the start and end dates for the given month and year
  const startDate = new Date(yearInt, monthInt - 1, 1);
  const endDate = new Date(yearInt, monthInt, 0);

  // Fetch student details
  const student = await prisma.student.findUnique({
    where: {
      student_id: studentId,
    },
    select: {
      first_name: true,
      last_name: true,
      profile_avatar_url: true,
      admissions: {
        select: {
          gr_number: true,
          roll_number: true,
          class: {
            select: {
              class_name: true,
              standard: true,
              section: true,
            },
          },
        },
        orderBy: {
          admission_date: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  // Fetch student's attendance for the specified month
  const attendanceRecords = await prisma.studentAttendance.findMany({
    where: {
      student_id: studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      status: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Format the response to match the frontend's expected structure
  const latestAdmission = student.admissions[0];
  const response = {
    studentDetails: {
      id: studentId,
      name: `${student.first_name} ${student.last_name}`,
      profilePhoto: student.profile_avatar_url,
      grNo: latestAdmission?.gr_number || 'N/A',
      standard: latestAdmission?.class?.standard || 'N/A',
      rollNo: latestAdmission?.roll_number || 'N/A',
      classId: latestAdmission?.class?.class_name || 'N/A',
    },
    attendance: attendanceRecords.map(record => ({
      date: record.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
      status: record.status,
    })),
  };

  res.status(200).json(response);
});

module.exports = { getStudentMonthlyAttendance };