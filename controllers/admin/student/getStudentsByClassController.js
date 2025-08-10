const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Get a list of students by their class and section.
 * @route   GET /api/admin/student/by-class?standard=10&section=a
 * @access  Private (assumed)
 */
const getStudentsByClass = asyncHandler(async (req, res) => {
  const { standard, section } = req.query;

  // 1. Validate input
  if (!standard || !section) {
    res.status(400); // Bad Request
    throw new Error('Both standard and section query parameters are required.');
  }

  // 2. Fetch admission records based on class standard and section
  const admissions = await prisma.admission.findMany({
    where: {
      class: {
        standard: {
          equals: String(standard),
        },
        section: {
          equals: section,
          mode: 'insensitive', // Case-insensitive matching for section
        },
      },
    },
    select: {
      admission_id: true,
      gr_number: true,
      roll_number: true,
      student: {
        select: {
          student_id: true,
          first_name: true,
          last_name: true,
        },
      },
      class: {
        select: {
          standard: true,
          section: true,
        },
      },
    },
    orderBy: {
      // Sorting by the student's roll number in ascending order
      roll_number: 'asc',
    },
  });

  // Check if any students were found
  if (!admissions || admissions.length === 0) {
    // It's not an error if no students are in a class, so we return an empty array.
    // If you prefer to treat this as "not found", uncomment the lines below.
    // res.status(404);
    // throw new Error('No students found for the specified class.');
    return res.status(200).json({
        message: 'No students found for the specified class.',
        data: [],
    });
  }

  // 3. Transform the data into the required flat array structure
  const studentsList = admissions.map(admission => ({
    id: admission.student.student_id,
    firstName: admission.student.first_name,
    lastName: admission.student.last_name,
    grNumber: admission.gr_number,
    class: admission.class.standard,
    section: admission.class.section,
    rollNo: admission.roll_number,
    admissionId: admission.admission_id,
  }));

  // 4. Send the successful response
  res.status(200).json({
    message: 'Students retrieved successfully.',
    data: studentsList,
  });
});

module.exports = { getStudentsByClass };