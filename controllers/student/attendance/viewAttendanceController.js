const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const { format, startOfMonth, endOfMonth } = require('date-fns');

const prisma = new PrismaClient();

/**
 * @description   Get student's profile and monthly attendance
 * @route         GET /api/student/attendance
 * @access        Private (Student)
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // 1. Validate Input
  const { year, month } = req.query;
  if (!year || !month || isNaN(parseInt(year)) || isNaN(parseInt(month))) {
    res.status(400);
    throw new Error('Year and month are required and must be numbers.');
  }

  // 2. Find the Student and their current class details
  const studentProfile = await prisma.student.findUnique({
    where: {
      user_id: userId,
    },
    include: {
      details: {
        select: {
          middle_name: true,
        },
      },
      admissions: {
        orderBy: {
          admission_date: 'desc',
        },
        take: 1,
        include: {
          class: {
            select: {
              standard: true,
              section: true,
              medium: true,
            },
          },
        },
      },
    },
  });

  if (!studentProfile) {
    res.status(404);
    throw new Error('Student profile not found.');
  }

  // 3. Fetch Attendance Data for the specified month
  const parsedYear = parseInt(year);
  // JS Date months are 0-indexed, so subtract 1 from the query month
  const parsedMonth = parseInt(month) - 1; 

  const startDate = startOfMonth(new Date(parsedYear, parsedMonth));
  const endDate = endOfMonth(new Date(parsedYear, parsedMonth));

  const attendanceRecords = await prisma.studentAttendance.findMany({
    where: {
      student_id: studentProfile.student_id,
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

  // 4. Format data for the frontend
  const currentAdmission = studentProfile.admissions[0];
  if (!currentAdmission) {
    res.status(404);
    throw new Error('Student admission details not found. Cannot determine class.');
  }

  // Helper function to format the medium
  const formatMedium = (medium) => {
    if (!medium) return '';
    switch (medium) {
        case 'English': return 'EM';
        case 'Hindi': return 'HM';
        case 'Gujarati': return 'GM';
        default: return medium.substring(0, 2).toUpperCase();
    }
  }
  
  const studentDetails = {
    name: `${studentProfile.first_name} ${studentProfile.details?.middle_name || ''} ${studentProfile.last_name}`.replace(/\s+/g, ' ').trim(),
    grNo: currentAdmission.gr_number,
    standard: `${currentAdmission.class.standard} (${formatMedium(currentAdmission.class.medium)})-${currentAdmission.class.section}`,
    rollNo: currentAdmission.roll_number,
  };

  // Helper to format attendance status from enum to display string
  const formatStatus = (status) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'on_leave':
        return 'Leave';
      case 'half_day':
        return 'Half-Day';
      case 'late':
          return 'Late'; // Assuming 'Late' might be treated as 'Present' on frontend
      default:
        return 'Unknown';
    }
  };

  const attendanceData = attendanceRecords.map((record) => ({
    date: format(new Date(record.date), 'yyyy-MM-dd'),
    status: formatStatus(record.status),
  }));

  // 5. Send Response
  res.status(200).json({
    student: studentDetails,
    attendanceData: attendanceData,
  });
});

module.exports = {
  getStudentAttendance,
};