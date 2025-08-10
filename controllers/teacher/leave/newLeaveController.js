const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @controller Apply for a new leave
 * @route POST /api/teacher/leave/apply
 * @access Private (Teacher)
 */
const applyForLeave = asyncHandler(async (req, res) => {
  // The employeeId is retrieved from the authenticated user's session
  const { employeeId } = req.user;

  // Destructure required fields from the request body
  const { leave_type, start_date, end_date, reason, supporting_document_url } = req.body;

  // Basic validation to ensure required fields are provided
  if (!leave_type || !start_date || !end_date || !reason) {
    res.status(400);
    throw new Error('Please provide all required fields: leave_type, start_date, end_date, and reason.');
  }
  
  // Validate date format and logic
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400);
    throw new Error('Invalid date format. Please use ISO-8601 format (YYYY-MM-DD).');
  }

  if (endDate < startDate) {
    res.status(400);
    throw new Error('End date cannot be earlier than the start date.');
  }

  // Create a new leave record in the database
  const newLeave = await prisma.employeeLeave.create({
    data: {
      employee_id: employeeId,
      leave_type,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      reason,
      supporting_document_url, // This can be null if not provided
      status: 'pending', // Default status for a new request as per schema
    },
  });

  res.status(201).json({
    message: 'Leave request submitted successfully. It is now pending approval.',
    data: newLeave,
  });
});

module.exports = {
  applyForLeave,
};