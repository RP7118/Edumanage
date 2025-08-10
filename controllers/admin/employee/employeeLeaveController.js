const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");
const prisma = new PrismaClient();

// #################################################################
// CONTROLLER: Get All Leave Requests (SIMPLIFIED)
// #################################################################
const getAllLeaveRequests = asyncHandler(async (req, res) => {
  const { department, type, status, startDate, endDate, search } = req.query;

  const whereClause = {};

  if (type) whereClause.leave_type = type;
  if (status) whereClause.status = status;
  if (startDate && endDate) {
    whereClause.AND = [
      { start_date: { gte: new Date(startDate) } },
      { end_date: { lte: new Date(endDate) } },
    ];
  }

  whereClause.employee = {};
  if (search) {
    whereClause.employee.OR = [
      { full_name: { contains: search, mode: "insensitive" } },
      { employee_code: { contains: search, mode: "insensitive" } },
    ];
  }
  if (department) {
    whereClause.employee.department = {
      department_name: { equals: department, mode: "insensitive" },
    };
  }

  const leaveRequests = await prisma.employeeLeave.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          employee_id: true,
          full_name: true,
          employee_code: true,
          profile_avatar_url: true,
          department: {
            select: {
              department_name: true,
            },
          },
        },
      },
      status_history: {
        orderBy: {
          created_at: 'desc',
        },
      }
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const formattedLeaveRequests = leaveRequests.map(leave => ({
    leave_id: leave.leave_id,
    leave_type: leave.leave_type,
    start_date: leave.start_date,
    end_date: leave.end_date,
    reason: leave.reason,
    status: leave.status,
    supporting_document_url: leave.supporting_document_url,
    created_at: leave.created_at,
    employee: {
      id: leave.employee.employee_id,
      name: leave.employee.full_name,
      avatar: leave.employee.profile_avatar_url || 'https://placehold.co/150x150/E2E8F0/4A5568?text=AV',
      employeeId: leave.employee.employee_code,
      department: leave.employee.department?.department_name || 'N/A'
    },
    history: leave.status_history.map(h => ({
      status: h.status,
      comment: h.comment,
      changed_at: h.created_at,
    })),
  }));

  res.status(200).json(formattedLeaveRequests);
});


// #################################################################
// CONTROLLER: Create a New Leave Request (SIMPLIFIED)
// #################################################################
const createLeaveRequest = asyncHandler(async (req, res) => {
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;
  const supportingDocumentUrl = req.file ? req.file.location : null;

  if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
    res.status(400);
    throw new Error("Please provide all required fields: employeeId, leaveType, startDate, endDate, reason");
  }
  
  const newLeaveRequest = await prisma.$transaction(async (tx) => {
    const leave = await tx.employeeLeave.create({
      data: {
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        reason,
        supporting_document_url: supportingDocumentUrl,
        status: 'pending',
      },
    });
    await tx.leaveStatusHistory.create({
      data: {
        leave_id: leave.leave_id,
        status: 'pending',
        comment: 'Leave request created.',
      },
    });
    return leave;
  });

  res.status(201).json({
    message: "Leave request created successfully.",
    data: newLeaveRequest,
  });
});

// #################################################################
// CONTROLLER: Update Leave Request Status (SIMPLIFIED)
// #################################################################
const updateLeaveStatus = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;
  const { status, reason } = req.body;

  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400);
    throw new Error("Invalid status provided. Must be one of: pending, approved, rejected.");
  }
  
  const leaveToUpdate = await prisma.employeeLeave.findUnique({
    where: { leave_id: leaveId }
  });
  if (!leaveToUpdate) {
    res.status(404);
    throw new Error("Leave request not found.");
  }

  const updatedLeave = await prisma.$transaction(async (tx) => {
    const leave = await tx.employeeLeave.update({
      where: { leave_id: leaveId },
      data: { status },
    });
    await tx.leaveStatusHistory.create({
      data: {
        leave_id: leaveId,
        status,
        comment: reason,
      },
    });

    if (status === 'approved') {
        const dates = [];
        let currentDate = new Date(leave.start_date);
        while (currentDate <= new Date(leave.end_date)) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        for (const date of dates) {
            await tx.employeeAttendance.upsert({
                where: {
                    employee_id_date: {
                        employee_id: leave.employee_id,
                        date: date,
                    }
                },
                update: {
                    status: 'on_leave',
                    source: 'manual',
                    remarks: `Approved Leave: ${leave.reason}`
                },
                create: {
                    employee_id: leave.employee_id,
                    date: date,
                    status: 'on_leave',
                    source: 'manual',
                    remarks: `Approved Leave: ${leave.reason}`
                }
            });
        }
    }

    return leave;
  });

  res.status(200).json({
    message: `Leave request has been ${status}.`,
    data: updatedLeave,
  });
});

// #################################################################
// CONTROLLER: Get Employee Leave Records by Employee ID
// #################################################################
const getEmployeeLeaveRecords = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { status, type, startDate, endDate, limit = 10, offset = 0 } = req.query;

  if (!employeeId) {
    res.status(400);
    throw new Error("Employee ID is required in query parameters");
  }

  // First verify that the employee exists
  const employee = await prisma.employee.findUnique({
    where: { employee_id: employeeId },
    select: {
      employee_id: true,
      full_name: true,
      employee_code: true,
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
    throw new Error("Employee not found");
  }

  // Build where clause for filtering leave records
  const whereClause = {
    employee_id: employeeId,
  };

  if (status) whereClause.status = status;
  if (type) whereClause.leave_type = type;
  if (startDate && endDate) {
    whereClause.AND = [
      { start_date: { gte: new Date(startDate) } },
      { end_date: { lte: new Date(endDate) } },
    ];
  }

  // Get total count for pagination
  const totalCount = await prisma.employeeLeave.count({
    where: whereClause,
  });

  // Fetch leave records
  const leaveRecords = await prisma.employeeLeave.findMany({
    where: whereClause,
    include: {
      status_history: {
        orderBy: {
          created_at: 'desc',
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: parseInt(limit),
    skip: parseInt(offset),
  });

  const formattedLeaveRecords = leaveRecords.map(leave => ({
    leave_id: leave.leave_id,
    leave_type: leave.leave_type,
    start_date: leave.start_date,
    end_date: leave.end_date,
    reason: leave.reason,
    status: leave.status,
    supporting_document_url: leave.supporting_document_url,
    created_at: leave.created_at,
    updated_at: leave.updated_at,
    duration_days: Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1,
    history: leave.status_history.map(h => ({
      status: h.status,
      comment: h.comment,
      changed_at: h.created_at,
    })),
  }));

  res.status(200).json({
    employee: {
      id: employee.employee_id,
      name: employee.full_name,
      employee_code: employee.employee_code,
      avatar: employee.profile_avatar_url || 'https://placehold.co/150x150/E2E8F0/4A5568?text=AV',
      department: employee.department?.department_name || 'N/A'
    },
    leave_records: formattedLeaveRecords,
    pagination: {
      total_count: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
      has_more: (parseInt(offset) + parseInt(limit)) < totalCount,
    },
  });
});

module.exports = {
  getAllLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  getEmployeeLeaveRecords,
};