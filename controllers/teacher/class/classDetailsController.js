const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Get all classes where the requesting teacher is the class teacher
 * @route   GET /api/teacher/class/details
 * @access  Private (Requires Teacher role)
 */
const getClassDetails = asyncHandler(async (req, res) => {
  // Retrieve the employeeId from the authenticated user's session
  const { employeeId } = req.user;

  if (!employeeId) {
    res.status(401);
    throw new Error('Not authorized. No employee ID found.');
  }

  // Find all classes assigned to the teacher
  const classes = await prisma.class.findMany({
    where: {
      class_teacher_id: employeeId,
    },
    include: {
      // Include the academic year for context
      academicYear: {
        select: {
          year_name: true,
        },
      },
      // Include all course offerings to list subjects and their teachers
      courseOfferings: {
        include: {
          subject: {
            select: {
              subject_id: true,
              subject_name: true,
            },
          },
          teacher: {
            select: {
              full_name: true,
            },
          },
        },
      },
      // Include the class teacher's details
      classTeacher: {
        select: {
          full_name: true,
        },
      },
      // Get a count of enrolled students in the class
      _count: {
        select: {
            admissions: true
        }
      }
    },
    orderBy: [
        { standard: 'asc' },
        { section: 'asc' }
    ]
  });

  if (!classes.length) {
    return res.status(200).json([]); // Return an empty array if no classes are found
  }

  // Reshape the data for a cleaner, more frontend-friendly structure
  const formattedClasses = classes.map(cls => ({
    id: cls.class_id,
    name: cls.standard,
    section: cls.section,
    academicYear: cls.academicYear.year_name,
    classTeacher: cls.classTeacher?.full_name || 'N/A',
    studentCount: cls._count.admissions,
    subjects: cls.courseOfferings.map(offering => ({
        id: offering.subject.subject_id,
        name: offering.subject.subject_name,
        teacher: offering.teacher?.full_name || 'Not Assigned',
    }))
  }));

  res.status(200).json(formattedClasses);
});

module.exports = {
  getClassDetails,
};