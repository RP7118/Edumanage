const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');
const prisma = new PrismaClient();

/**
 * @desc    Get a list of all academic years for dropdowns
 * @route   GET /api/admin/classes/academic-years
 * @access  Private (Admin)
 *
 * @returns {object} 200 - An array of academic year objects.
 * @returns {object} 500 - If an unexpected server error occurs.
 *
 * @example Response
 * [
 * {
 * "id": "uuid-for-year-1",
 * "name": "2025-2026",
 * "isActive": true
 * },
 * {
 * "id": "uuid-for-year-2",
 * "name": "2024-2025",
 * "isActive": false
 * }
 * ]
 */
const getAcademicYearList = asyncHandler(async (req, res) => {
  const academicYears = await prisma.academicYear.findMany({
    select: {
      academic_year_id: true,
      year_name: true,
      is_active: true,
    },
    orderBy: {
      start_date: 'desc', // Show the most recent academic year first
    },
  });

  // Map the database fields to a simpler, consistent format for the frontend
  const academicYearList = academicYears.map((year) => ({
    id: year.academic_year_id,
    name: year.year_name,
    isActive: year.is_active,
  }));

  res.status(200).json(academicYearList);
});

module.exports = {
  getAcademicYearList,
};