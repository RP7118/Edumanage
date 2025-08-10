const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

/**
 * @description   Fetch daily attendance for a specific class
 * @route         GET /api/teacher/class/attendance
 * @access        Private (Teacher)
 * @query         classId={class_id}&date={YYYY-MM-DD}
 */
const getClassAttendance = asyncHandler(async (req, res) => {
  const { classId, date } = req.query;

  if (!classId || !date) {
    res.status(400);
    throw new Error('Class ID and date are required query parameters.');
  }

  // Validate date format and create Date objects for the start and end of the day
  const attendanceDate = new Date(date);
  if (isNaN(attendanceDate.getTime())) {
    res.status(400);
    throw new Error('Invalid date format. Please use YYYY-MM-DD.');
  }
  
  // Fetch attendance records along with student details
  const attendanceRecords = await prisma.studentAttendance.findMany({
    where: {
      class_id: classId,
      date: attendanceDate,
    },
    include: {
      student: {
        select: {
          student_id: true,
          first_name: true,
          last_name: true,
          profile_avatar_url: true,
          // Include admission details to get the roll number for that class
          admissions: {
            where: {
              class_id: classId,
            },
            select: {
              roll_number: true,
            },
          },
        },
      },
    },
    orderBy: {
      student: {
        first_name: 'asc',
      },
    },
  });

  // If no records are found, return an empty array
  if (!attendanceRecords) {
    return res.status(200).json([]);
  }

  // Sanitize and format the response for easier frontend consumption
  const formattedAttendance = attendanceRecords.map(record => {
    return {
      attendance_id: record.attendance_id,
      date: record.date,
      status: record.status,
      remarks: record.remarks,
      student_id: record.student.student_id,
      first_name: record.student.first_name,
      last_name: record.student.last_name,
      profile_avatar_url: record.student.profile_avatar_url,
      // Safely access the roll number
      roll_number: record.student.admissions[0]?.roll_number || 'N/A',
    };
  });

  res.status(200).json(formattedAttendance);
});

module.exports = { getClassAttendance };