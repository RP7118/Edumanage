const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');
const prisma = new PrismaClient();

/**
 * @desc    Get a list of students by standard and sections
 * @route   GET /api/admin/classes/students
 * @access  Private (Admin)
 * * @query   standard {string} - The standard of the class.
 * @query   sections {string[]} - An array of sections.
 *
 * @returns {object} 200 - An array of student objects.
 * @returns {object} 400 - If standard or sections are not provided.
 * @returns {object} 500 - If an unexpected server error occurs.
 *
 * @example Response
 * [
 * {
 * "id": "student-uuid-1",
 * "name": "John Doe",
 * "regNo": "STU12345",
 * "section": "A"
 * },
 * {
 * "id": "student-uuid-2",
 * "name": "Jane Smith",
 * "regNo": "STU67890",
 * "section": "B"
 * }
 * ]
 */
const getStudentsByClass = asyncHandler(async (req, res) => {
  const { standard, sections } = req.query;

  if (!standard || !sections) {
    return res.status(400).json({ message: 'Standard and sections are required' });
  }

  const sectionsArray = Array.isArray(sections) ? sections : [sections];

  try {
    const students = await prisma.student.findMany({
      where: {
        admissions: {
          some: {
            class: {
              standard: standard,
              section: {
                in: sectionsArray,
              },
            },
          },
        },
      },
      select: {
        student_id: true,
        first_name: true,
        last_name: true,
        admissions: {
          select: {
            admission_number: true,
            class: {
              select: {
                section: true,
              },
            },
          },
          where: {
            class: {
              standard: standard,
              section: {
                in: sectionsArray,
              },
            },
          },
        },
      },
    });

    const formattedStudents = students.map(student => ({
      id: student.student_id,
      name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admissions[0]?.admission_number,
      section: student.admissions[0]?.class.section,
    }));

    res.status(200).json(formattedStudents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

module.exports = {
    getStudentsByClass,
};