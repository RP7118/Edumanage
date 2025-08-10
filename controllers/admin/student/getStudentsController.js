const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');
const prisma = new PrismaClient();

/**
 * @desc    Get all students with optional filtering by class and a search query.
 * @route   GET /api/students
 * @access  Private
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example
 * // Fetch all students
 * GET /api/students
 *
 * // Fetch students from class "6-A"
 * GET /api/students?class=6-A
 *
 * // Search for students with "carter" in their name or admission number
 * GET /api/students?search=carter
 *
 * // Search for a specific student ID
 * GET /api/students?search=StudentI (S123)
 *
 * // Fetch students from class "6-A" and search for "John"
 * GET /api/students?class=6-A&search=John
 */
const getStudents = asyncHandler(async (req, res) => {
  const { class: className, search } = req.query;

  let where = {};
  const andConditions = [];

  // 1. Handle the 'class' filter
  if (className) {
    const [standard, section] = className.split('-');
    if (standard && section) {
      andConditions.push({
        admissions: {
          some: {
            class: {
              standard: {
                equals: standard,
                mode: 'insensitive',
              },
              section: {
                equals: section,
                mode: 'insensitive',
              },
            },
          },
        },
      });
    }
  }

  // 2. Handle the 'search' filter
  if (search) {
    const orConditions = [
      {
        first_name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        last_name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        admissions: {
          some: {
            admission_number: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      },
    ];
    andConditions.push({ OR: orConditions });
  }

  if (andConditions.length > 0) {
    where = { AND: andConditions };
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      admissions: {
        include: {
          class: {
            select: {
              class_name: true,
              standard: true,
              section: true,
              medium: true,
            },
          },
        },
      },
      details: true,
    },
    orderBy: {
      first_name: 'asc'
    }
  });

  if (!students || students.length === 0) {
    res.status(404);
    throw new Error('No students found with the provided criteria.');
  }

  res.status(200).json({
    message: 'Students retrieved successfully.',
    count: students.length,
    data: students,
  });
});

module.exports = {
  getStudents,
};