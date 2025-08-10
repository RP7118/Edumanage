const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Get a single student by ID with all related details.
 * @route   GET /api/students/:id
 * @access  Private
 */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: { student_id: id },
    include: {
      details: true,
      admissions: {
        include: {
          class: {
            select: { class_name: true, standard: true, section: true }
          }
        }
      },
      family_details: true,
      previous_academic_details: true,
      payment_details: true,
      hostel_details: true,
      facilities: true,
      addresses: true,
      documents: true,
      enrollments: {
        include: {
          courseOffering: {
            include: {
              subject: true,
              teacher: {
                select: { full_name: true }
              }
            }
          }
        }
      }
    },
  });

  if (!student) {
    res.status(404);
    throw new Error('Student not found.');
  }

  res.status(200).json({
    message: 'Student retrieved successfully.',
    data: student,
  });
});

module.exports = { getStudentById};