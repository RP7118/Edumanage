const asyncHandler = require('express-async-handler');
const { PrismaClient, attendance_status_enum } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc      Get student attendance for a class by a specific date OR by a specific month.
 * @route     GET /api/admin/student/attendance
 * @access    Private (Admin)
 * @query     {string} standard - The standard of the class (e.g., "10").
 * @query     {string} section - The section of the class (e.g., "A").
 * @query     {string} [date] - The date to check (format: YYYY-MM-DD).
 * @query     {string} [month] - The month to check (format: YYYY-MM).
 * @note      Either 'date' or 'month' must be provided, but not both.
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { standard, section, date, month } = req.query;

  // 1. Validate input query parameters
  if (!standard || !section) {
    res.status(400);
    throw new Error('Standard and section are required query parameters.');
  }

  // Ensure either date or month is provided, but not both
  if ((!date && !month) || (date && month)) {
    res.status(400);
    throw new Error('You must provide either a "date" (YYYY-MM-DD) or a "month" (YYYY-MM) query parameter, but not both.');
  }

  // 2. Find the class based on standard and section for the current active academic year
  const activeClass = await prisma.class.findFirst({
    where: {
      standard: String(standard),
      section: String(section),
      academicYear: {
        is_active: true,
      },
    },
    select: {
      class_id: true,
    },
  });

  if (!activeClass) {
    res.status(404);
    throw new Error(
      `Class with standard ${standard} and section ${section} not found in the active academic year.`
    );
  }

  // 3. Dynamically create the date range for the query
  let startDate, endDate;

  if (date) {
    // Logic for a single date
    const queryDate = new Date(String(date));
    if (isNaN(queryDate.getTime())) {
      res.status(400);
      throw new Error('Invalid date format. Please use YYYY-MM-DD.');
    }
    // Set the time to the beginning and end of the day in UTC
    startDate = new Date(queryDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    endDate = new Date(queryDate.toISOString().split('T')[0] + 'T23:59:59.999Z');
  } else if (month) {
    // Logic for a full month
    const monthRegex = /^\d{4}-\d{2}$/; // Regex to validate YYYY-MM format
    if (!monthRegex.test(String(month))) {
        res.status(400);
        throw new Error('Invalid month format. Please use YYYY-MM.');
    }
    const [year, monthIndex] = String(month).split('-').map(Number);
    // The start of the month (monthIndex is 1-based, but Date constructor is 0-based)
    startDate = new Date(Date.UTC(year, monthIndex - 1, 1));
    // The end of the month - we get the first day of the *next* month and subtract one millisecond
    endDate = new Date(Date.UTC(year, monthIndex, 1));
    endDate.setUTCMilliseconds(endDate.getUTCMilliseconds() - 1);
  }

  // 4. Fetch existing attendance records for the given class_id and date range
  const existingAttendance = await prisma.studentAttendance.findMany({
    where: {
      class_id: activeClass.class_id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    // Include student details for easier use on the frontend
    include: {
      student: {
        select: {
          student_id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: {
        date: 'asc', // Optional: order results by date
    }
  });

  // 5. Send the successful response
  res.status(200).json({
    message: 'Attendance records fetched successfully.',
    count: existingAttendance.length,
    data: existingAttendance,
  });
});


/**
 * @desc      Create or update attendance records for a class on a specific date.
 * @route     PUT /api/admin/student/attendance
 * @access    Private (Admin)
 * @body      { "standard": "10", "section": "A", "date": "2025-06-22", "attendanceData": [{ "studentId": "uuid", "status": "present", "remarks": "Optional note" }] }
 */
const upsertStudentAttendance = asyncHandler(async (req, res) => {
    const { standard, section, date, attendanceData } = req.body;

    // 1. Validate payload
    if (!standard || !section || !date || !attendanceData) {
        res.status(400);
        throw new Error('Standard, section, date, and attendanceData are required in the request body.');
    }

    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        res.status(400);
        throw new Error('attendanceData must be a non-empty array.');
    }

    // 2. Find the class ID from standard and section in the active academic year
    const activeClass = await prisma.class.findFirst({
        where: {
            standard: String(standard),
            section: String(section),
            academicYear: {
                is_active: true,
            },
        },
        select: {
            class_id: true,
        },
    });

    if (!activeClass) {
        res.status(404);
        throw new Error(`Class with standard ${standard} and section ${section} not found in the active academic year.`);
    }

    // 3. Prepare data for transaction
    const attendanceDate = new Date(date + 'T00:00:00.000Z'); // Normalize date to start of day UTC
     if (isNaN(attendanceDate.getTime())) {
        res.status(400);
        throw new Error('Invalid date format. Please use YYYY-MM-DD.');
    }

    const validStatuses = Object.values(attendance_status_enum);

    const upsertPromises = attendanceData.map(record => {
        // Validate each record within the array
        if (!record.studentId || !record.status) {
            throw new Error('Each object in attendanceData must contain "studentId" and "status".');
        }
        if (!validStatuses.includes(record.status)) {
            throw new Error(`Invalid attendance status: '${record.status}'. Valid statuses are: ${validStatuses.join(', ')}.`);
        }

        // Use the unique compound key from the schema for the `where` clause
        return prisma.studentAttendance.upsert({
            where: {
                student_date_attendance_unique: {
                    student_id: record.studentId,
                    date: attendanceDate,
                },
            },
            update: {
                status: record.status,
                remarks: record.remarks || null,
            },
            create: {
                student_id: record.studentId,
                class_id: activeClass.class_id,
                date: attendanceDate,
                status: record.status,
                remarks: record.remarks || null,
            },
        });
    });

    // 4. Execute all operations in a single transaction
    const result = await prisma.$transaction(upsertPromises);

    // 5. Send successful response
    res.status(200).json({
        message: `Successfully saved attendance for ${result.length} students.`,
        data: {
            count: result.length,
        },
    });
});


module.exports = {
  getStudentAttendance, // Renamed export
  upsertStudentAttendance
};