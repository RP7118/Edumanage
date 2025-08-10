const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

/**
 * @desc    Get all Academic Years
 * @route   GET /api/v1/academics/years
 * @access  Private (Requires appropriate role)
 *
 * @summary Retrieves all academic years from the database, ordered by start_date descending.
 * Returns an empty array if none exist.
 */
const getAllAcademicYears = asyncHandler(async (req, res) => {
  // --- 1. Fetch All Academic Years ---
  const academicYears = await prisma.AcademicYear.findMany({
    orderBy: { start_date: 'desc' }
  });

  // --- 2. Map to Frontend-Friendly Format (camelCase) ---
  const responseData = academicYears.map(year => ({
    id: year.academic_year_id,
    name: year.year_name,
    startDate: year.start_date ? year.start_date.toISOString().split('T')[0] : '',
    endDate: year.end_date ? year.end_date.toISOString().split('T')[0] : '',
    isActive: year.is_active,
    createdAt: year.created_at,
    updatedAt: year.updated_at
  }));

  // --- 3. Send Response ---
  res.status(200).json({
    message: 'Academic years retrieved successfully.',
    data: responseData
  });
});

/**
 * @desc    Create a new Academic Year
 * @route   POST /api/v1/academics/years
 * @access  Private (Requires appropriate role)
 *
 * @body    { name, startDate, endDate, isActive }
 */
const createAcademicYear = asyncHandler(async (req, res) => {
  // --- 1. Extract and Validate Input ---
  const { name, startDate, endDate, isActive } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({
      message: 'Name, startDate and endDate are required.'
    });
  }

  // --- 2. Check for Duplicate Year Name ---
  const existingYear = await prisma.AcademicYear.findUnique({
    where: { year_name: name }
  });
  if (existingYear) {
    return res.status(409).json({
      message: 'An academic year with that name already exists.'
    });
  }

  // --- 3. Create Academic Year ---
  const academicYear = await prisma.AcademicYear.create({
    data: {
      year_name: name,
      start_date: new Date(startDate),
      end_date: new Date(endDate),
      is_active: isActive === true || isActive === 'true'
    }
  });

  // --- 4. Map to Frontend-Friendly Format ---
  const responseData = {
    id: academicYear.academic_year_id,
    name: academicYear.year_name,
    startDate: academicYear.start_date ? academicYear.start_date.toISOString().split('T')[0] : '',
    endDate: academicYear.end_date ? academicYear.end_date.toISOString().split('T')[0] : '',
    isActive: academicYear.is_active,
    createdAt: academicYear.created_at,
    updatedAt: academicYear.updated_at
  };

  // --- 5. Send Response ---
  res.status(201).json({
    message: 'Academic year created successfully.',
    data: responseData
  });
});

module.exports = {
  getAllAcademicYears,
  createAcademicYear
};