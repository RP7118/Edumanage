const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');
const prisma = new PrismaClient();

/**
 * @desc    Get a list of active teachers and admins for dropdowns
 * @route   GET /api/admin/classes/teachers
 * @access  Private (Admin)
 *
 * @returns {object} 200 - An array of teacher objects.
 * @returns {object} 500 - If an unexpected server error occurs.
 *
 * @example Response
 * [
 * {
 * "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 * "name": "Dr. Eleanor Vance"
 * },
 * {
 * "id": "b2c3d4e5-f6a7-8901-2345-67890abcdef1",
 * "name": "Mr. Steven Crain"
 * }
 * ]
 */
const getTeacherList = asyncHandler(async (req, res) => {
  const teachers = await prisma.employee.findMany({
    where: {
      status: 'active',
      role: {
        in: ['teacher', 'admin'],
      },
    },
    select: {
      employee_id: true,
      full_name: true,
    },
    orderBy: {
      full_name: 'asc', // Sort alphabetically for user-friendliness
    },
  });

  // Map the database fields to a simpler format for the frontend
  const teacherList = teachers.map((teacher) => ({
    id: teacher.employee_id,
    name: teacher.full_name,
  }));

  res.status(200).json(teacherList);
});

module.exports = {
  getTeacherList,
};