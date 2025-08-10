const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

// Helper to check for valid UUID
const isUUID = (str) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * @description Get all employee attendance records with filtering
 * @route GET /api/admin/employee/attendance
 * @access Private/Admin
 */
const getAttendanceRecords = asyncHandler(async (req, res) => {
  // 1. DESTRUCTURE QUERY PARAMETERS
  const { date, department, status, search } = req.query;

  // 2. PREPARE A ROBUST, TIMEZONE-AGNOSTIC DATE RANGE
  // Get the date string from the query. If it's missing, default to today's date in 'YYYY-MM-DD' format.
  const dateParam = date ? date : new Date().toISOString().split('T')[0];

  // Construct startDate and endDate explicitly in UTC to avoid all timezone issues.
  // This defines the day as starting from midnight UTC to the last millisecond of the day UTC.
  const startDate = new Date(`${dateParam}T00:00:00.000Z`);
  const endDate = new Date(`${dateParam}T23:59:59.999Z`);
  
  // 3. CONSTRUCT THE WHERE CLAUSE FOR THE EMPLOYEE MODEL
  const employeeWhereClause = {};
  if (search) {
    employeeWhereClause.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { employee_code: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (department) {
    employeeWhereClause.department = {
      department_name: { equals: department, mode: 'insensitive' },
    };
  }

  // 4. PERFORM A SINGLE, EFFICIENT QUERY
  const employees = await prisma.employee.findMany({
    where: employeeWhereClause,
    include: {
      department: {
        select: {
          department_name: true,
        },
      },
      attendance_records: {
        // Use the robust UTC date range for filtering
        where: {
          date: {
            gte: startDate,
            lte: endDate, // Using 'lte' (less than or equal to) is slightly more inclusive
          },
          ...(status && { status: status }),
        },
      },
    },
    orderBy: {
      full_name: 'asc',
    },
  });

  // 5. If the 'status' filter is active, filter out employees who don't have a matching attendance record.
  const filteredEmployees = status
    ? employees.filter(employee => employee.attendance_records.length > 0)
    : employees;

  // 6. FORMAT THE RESPONSE TO MATCH FRONTEND EXPECTATIONS
  const formattedResponse = filteredEmployees.map((employee) => {
    const attendance = employee.attendance_records[0] || null;

    return {
      id: employee.employee_id,
      name: employee.full_name,
      avatar:
        employee.profile_avatar_url ||
        `https://placehold.co/150x150/E2E8F0/4A5568?text=${employee.full_name.charAt(0)}`,
      employeeId: employee.employee_code,
      department: employee.department?.department_name || 'N/A',
      attendance: attendance
        ? {
            id: attendance.attendance_id,
            date: attendance.date,
            checkIn: attendance.check_in_time,
            checkOut: attendance.check_out_time,
            status: attendance.status,
            source: attendance.source,
            remarks: attendance.remarks,
          }
        : null,
    };
  });

  res.status(200).json(formattedResponse);
});



/**
 * @description Mark or update a single attendance entry for an employee
 * @route POST /api/admin/employees/attendance/mark-single
 * @access Private/Admin
 */
const markSingleAttendance = asyncHandler(async (req, res) => {
  const { employeeId, date, status, checkIn, checkOut, reason } = req.body;

  // Manual Validation
  if (!employeeId || !isUUID(employeeId)) {
    res.status(400);
    throw new Error("Valid employee ID is required.");
  }
  if (!date || isNaN(new Date(date).getTime())) {
    res.status(400);
    throw new Error("Valid date is required.");
  }
  const validStatuses = ["present", "absent", "late", "half_day", "on_leave"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status.");
  }
  if (checkIn && isNaN(new Date(checkIn).getTime())) {
    res.status(400);
    throw new Error("Invalid check-in time format.");
  }
  if (checkOut && isNaN(new Date(checkOut).getTime())) {
    res.status(400);
    throw new Error("Invalid check-out time format.");
  }

  const attendanceData = {
    employee_id: employeeId,
    date: new Date(date),
    status,
    check_in_time: checkIn ? new Date(checkIn) : null,
    check_out_time: checkOut ? new Date(checkOut) : null,
    remarks: reason,
    source: "manual", // Single entry is always manual
  };

  const attendanceRecord = await prisma.employeeAttendance.upsert({
    where: {
      employee_id_date: {
        employee_id: employeeId,
        date: new Date(date),
      },
    },
    update: attendanceData,
    create: attendanceData,
  });

  res.status(201).json({
    message: "Attendance marked successfully",
    data: attendanceRecord,
  });
});

/**
 * @description Mark or update attendance for multiple employees over a date range
 * @route POST /api/admin/employees/attendance/mark-bulk
 * @access Private/Admin
 */
const markBulkAttendance = asyncHandler(async (req, res) => {
  const { employeeIds, startDate, endDate, status, checkIn, checkOut, reason } =
    req.body;

  // Manual Validation
  if (
    !Array.isArray(employeeIds) ||
    employeeIds.length === 0 ||
    !employeeIds.every((id) => isUUID(id))
  ) {
    res.status(400);
    throw new Error("A valid array of employee IDs is required.");
  }
  if (!startDate || isNaN(new Date(startDate).getTime())) {
    res.status(400);
    throw new Error("Valid start date is required.");
  }
  if (!endDate || isNaN(new Date(endDate).getTime())) {
    res.status(400);
    throw new Error("Valid end date is required.");
  }
  const validStatuses = ["present", "absent", "late", "half_day", "on_leave"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status value.");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateRange = [];

  // Generate all dates in the range
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    dateRange.push(new Date(dt));
  }

  if (dateRange.length === 0 || employeeIds.length === 0) {
    res.status(400);
    throw new Error("Date range or employee selection is invalid.");
  }

  const upsertOperations = [];

  for (const date of dateRange) {
    for (const employeeId of employeeIds) {
      const attendanceData = {
        employee_id: employeeId,
        date: date,
        status,
        check_in_time: checkIn ? new Date(checkIn) : null,
        check_out_time: checkOut ? new Date(checkOut) : null,
        remarks: reason,
        source: "manual_bulk",
      };

      upsertOperations.push(
        prisma.employeeAttendance.upsert({
          where: { employee_id_date: { employee_id: employeeId, date: date } },
          update: attendanceData,
          create: attendanceData,
        })
      );
    }
  }

  try {
    const result = await prisma.$transaction(upsertOperations);
    res.status(201).json({
      message: `Bulk attendance marked successfully for ${result.length} records.`,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to mark bulk attendance. Please try again.");
  }
});

/**
 * @description Simulate syncing with a biometric device
 * @route POST /api/admin/employees/attendance/sync-biometric
 * @access Private/Admin
 */
const syncBiometricData = asyncHandler(async (req, res) => {
  // This is a mock simulation. In a real-world scenario, you would receive this data
  // from a file upload, a webhook, or an API call to the biometric device's software.
  const mockBiometricPunches = [
    { employee_code: "EMP00001", timestamp: new Date().setHours(9, 2, 15, 0) }, // 09:02:15
    { employee_code: "EMP00002", timestamp: new Date().setHours(9, 10, 5, 0) }, // 09:10:05 (Late)
    {
      employee_code: "EMP00001",
      timestamp: new Date().setHours(17, 35, 40, 0),
    }, // 17:35:40
    { employee_code: "EMP00003", timestamp: new Date().setHours(8, 55, 1, 0) }, // 08:55:01
    { employee_code: "EMP00003", timestamp: new Date().setHours(13, 0, 10, 0) }, // 13:00:10 (Half day)
  ];

  const attendanceByEmployee = {};

  // Group punches by employee code
  for (const punch of mockBiometricPunches) {
    if (!attendanceByEmployee[punch.employee_code]) {
      attendanceByEmployee[punch.employee_code] = [];
    }
    attendanceByEmployee[punch.employee_code].push(new Date(punch.timestamp));
  }

  const transactionList = [];

  for (const employeeCode in attendanceByEmployee) {
    const employee = await prisma.employee.findUnique({
      where: { employee_code: employeeCode },
    });
    if (!employee) continue; // Skip if employee code is not in DB

    const punches = attendanceByEmployee[employeeCode].sort((a, b) => a - b);
    const checkInTime = punches[0];
    const checkOutTime =
      punches.length > 1 ? punches[punches.length - 1] : null;

    let status = "present";
    if (
      checkInTime.getHours() > 9 ||
      (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 5)
    ) {
      status = "late";
    }
    if (checkOutTime && checkOutTime.getHours() < 14) {
      status = "half_day";
    }

    const attendanceDate = new Date(checkInTime);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendanceData = {
      employee_id: employee.employee_id,
      date: attendanceDate,
      status: status,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      source: "biometric",
      remarks: "Synced from biometric device BIO-001.",
    };

    transactionList.push(
      prisma.employeeAttendance.upsert({
        where: {
          employee_id_date: {
            employee_id: employee.employee_id,
            date: attendanceDate,
          },
        },
        update: { ...attendanceData, marked_by_id: null },
        create: attendanceData,
      })
    );
  }

  await prisma.$transaction(transactionList);

  res.status(200).json({
    message: "Biometric data synced successfully.",
    status: "success",
    syncedRecords: transactionList.length,
    lastSync: new Date().toISOString(),
  });
});


/**
 * @description Get employee attendance records for a specific employee within a date range
 * @route GET /api/admin/employee/attendance/:employeeId
 * @access Private/Admin
 */
const getEmployeeAttendanceByDateRange = asyncHandler(async (req, res) => {
  // 1. EXTRACT EMPLOYEE ID FROM PARAMS
  const { employeeId } = req.params;

  // 2. EXTRACT QUERY PARAMETERS
  const { startDate, endDate } = req.query;

  // 3. VALIDATE EMPLOYEE ID
  if (!employeeId || !isUUID(employeeId)) {
    res.status(400);
    throw new Error("Valid employee ID is required.");
  }

  // 4. VALIDATE DATE PARAMETERS
  if (!startDate || isNaN(new Date(startDate).getTime())) {
    res.status(400);
    throw new Error("Valid start date is required in query parameters.");
  }

  if (!endDate || isNaN(new Date(endDate).getTime())) {
    res.status(400);
    throw new Error("Valid end date is required in query parameters.");
  }

  // 5. ENSURE START DATE IS NOT AFTER END DATE
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    res.status(400);
    throw new Error("Start date cannot be after end date.");
  }

  // 6. PREPARE TIMEZONE-AGNOSTIC DATE RANGE
  // Convert to UTC to avoid timezone issues
  const startDateUTC = new Date(`${startDate}T00:00:00.000Z`);
  const endDateUTC = new Date(`${endDate}T23:59:59.999Z`);

  try {
    // 7. VERIFY EMPLOYEE EXISTS
    const employee = await prisma.employee.findUnique({
      where: {
        employee_id: employeeId,
      },
      select: {
        employee_id: true,
        employee_code: true,
        full_name: true,
        email: true,
        profile_avatar_url: true,
        department: {
          select: {
            department_name: true,
          },
        },
      },
    });

    if (!employee) {
      res.status(404);
      throw new Error("Employee not found.");
    }

    // 8. FETCH ATTENDANCE RECORDS FOR THE DATE RANGE
    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        employee_id: employeeId,
        date: {
          gte: startDateUTC,
          lte: endDateUTC,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // 9. CALCULATE ATTENDANCE STATISTICS
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (record) => record.status === 'present'
    ).length;
    const absentDays = attendanceRecords.filter(
      (record) => record.status === 'absent'
    ).length;
    const lateDays = attendanceRecords.filter(
      (record) => record.status === 'late'
    ).length;
    const halfDays = attendanceRecords.filter(
      (record) => record.status === 'half_day'
    ).length;
    const leaveDays = attendanceRecords.filter(
      (record) => record.status === 'on_leave'
    ).length;

    // 10. CALCULATE ATTENDANCE PERCENTAGE
    const workingDays = totalDays;
    const attendancePercentage = workingDays > 0 
      ? ((presentDays + lateDays + halfDays) / workingDays * 100).toFixed(2)
      : 0;

    // 11. FORMAT RESPONSE
    const formattedResponse = {
      employee: {
        id: employee.employee_id,
        employeeCode: employee.employee_code,
        name: employee.full_name,
        email: employee.email,
        avatar: employee.profile_avatar_url || 
          `https://placehold.co/150x150/E2E8F0/4A5568?text=${employee.full_name.charAt(0)}`,
        department: employee.department?.department_name || 'N/A',
      },
      dateRange: {
        startDate: startDate,
        endDate: endDate,
      },
      statistics: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        leaveDays,
        attendancePercentage: parseFloat(attendancePercentage),
      },
      attendanceRecords: attendanceRecords.map((record) => ({
        id: record.attendance_id,
        date: record.date,
        status: record.status,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        source: record.source,
        remarks: record.remarks,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      })),
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    // Handle any unexpected errors
    if (!res.headersSent) {
      res.status(500);
      throw new Error("Failed to fetch employee attendance records.");
    }
  }
});

/**
 * @description Get employee attendance summary for a specific month
 * @route GET /api/admin/employee/attendance/:employeeId/monthly
 * @access Private/Admin
 */
const getEmployeeMonthlyAttendance = asyncHandler(async (req, res) => {
  // 1. EXTRACT EMPLOYEE ID FROM PARAMS
  const { employeeId } = req.params;

  // 2. EXTRACT QUERY PARAMETERS
  const { year, month } = req.query;

  // 3. VALIDATE EMPLOYEE ID
  if (!employeeId || !isUUID(employeeId)) {
    res.status(400);
    throw new Error("Valid employee ID is required.");
  }

  // 4. VALIDATE YEAR AND MONTH
  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (!year || isNaN(yearNum) || yearNum < 2000 || yearNum > currentYear + 1) {
    res.status(400);
    throw new Error("Valid year is required (2000-" + (currentYear + 1) + ").");
  }

  if (!month || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    res.status(400);
    throw new Error("Valid month is required (1-12).");
  }

  // 5. CALCULATE START AND END DATES FOR THE MONTH
  const startDate = new Date(yearNum, monthNum - 1, 1); // First day of month
  const endDate = new Date(yearNum, monthNum, 0); // Last day of month

  // Convert to UTC
  const startDateUTC = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const endDateUTC = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

  try {
    // 6. VERIFY EMPLOYEE EXISTS
    const employee = await prisma.employee.findUnique({
      where: {
        employee_id: employeeId,
      },
      select: {
        employee_id: true,
        employee_code: true,
        full_name: true,
        email: true,
        profile_avatar_url: true,
        department: {
          select: {
            department_name: true,
          },
        },
      },
    });

    if (!employee) {
      res.status(404);
      throw new Error("Employee not found.");
    }

    // 7. FETCH ATTENDANCE RECORDS FOR THE MONTH
    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        employee_id: employeeId,
        date: {
          gte: startDateUTC,
          lte: endDateUTC,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 8. GROUP ATTENDANCE BY STATUS
    const attendanceByStatus = attendanceRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});

    // 9. FORMAT RESPONSE
    const formattedResponse = {
      employee: {
        id: employee.employee_id,
        employeeCode: employee.employee_code,
        name: employee.full_name,
        email: employee.email,
        avatar: employee.profile_avatar_url || 
          `https://placehold.co/150x150/E2E8F0/4A5568?text=${employee.full_name.charAt(0)}`,
        department: employee.department?.department_name || 'N/A',
      },
      period: {
        year: yearNum,
        month: monthNum,
        monthName: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' }),
        totalDaysInMonth: endDate.getDate(),
      },
      summary: {
        present: attendanceByStatus.present || 0,
        absent: attendanceByStatus.absent || 0,
        late: attendanceByStatus.late || 0,
        half_day: attendanceByStatus.half_day || 0,
        on_leave: attendanceByStatus.on_leave || 0,
        totalRecorded: attendanceRecords.length,
      },
      dailyAttendance: attendanceRecords.map((record) => ({
        date: record.date,
        status: record.status,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        source: record.source,
        remarks: record.remarks,
      })),
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    // Handle any unexpected errors
    if (!res.headersSent) {
      res.status(500);
      throw new Error("Failed to fetch employee monthly attendance.");
    }
  }
});

module.exports = {
  getAttendanceRecords,
  markSingleAttendance,
  markBulkAttendance,
  syncBiometricData,
  getEmployeeAttendanceByDateRange,
  getEmployeeMonthlyAttendance,
};
