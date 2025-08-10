const asyncHandler = require('express-async-handler');
const { PrismaClient } = require("../../../generated/prisma")

const prisma = new PrismaClient();

/**
 * @desc    Get all classes with teacher details and student/subject counts
 * @route   GET /api/admin/classes
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with an array of class objects.
 *
 * @example res.json
 * [
 *   {
 *     "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 *     "name": "Class 10-A",
 *     "standard": "10",
 *     "section": "A",
 *     "medium": "English",
 *     "capacity": 40,
 *     "teacher": {
 *       "id": "t1e2a3c4-h5e6-r789-0123-456789abcdef",
 *       "name": "Jane Doe",
 *       "avatar": "https://example.com/avatars/jane_doe.png"
 *     },
 *     "studentCount": 38,
 *     "subjectCount": 7
 *   },
 *   {
 *     "id": "b2c3d4e5-f6a7-8901-2345-67890abcdef1",
 *     "name": "Class 9-B",
 *     "standard": "9",
 *     "section": "B",
 *     "medium": "English",
 *     "capacity": 35,
 *     "teacher": null,
 *     "studentCount": 32,
 *     "subjectCount": 6
 *   }
 * ]
 */
const getClasses = asyncHandler(async (req, res) => {
  // Fetch all classes from the database using Prisma
  const classes = await prisma.class.findMany({
    include: {
      // Include the related class teacher's details.
      // We select only the fields needed by the frontend to keep the payload small.
      classTeacher: {
        select: {
          employee_id: true,
          full_name: true,
          profile_avatar_url: true,
        },
      },
      // Use Prisma's _count to efficiently get the number of related records
      // without fetching the actual records.
      _count: {
        select: {
          admissions: true, // Counts students admitted to the class
          courseOfferings: true, // Counts subjects offered in the class
        },
      },
    },
    // Order the results for a consistent and logical display
    orderBy: [
      {
        standard: 'asc',
      },
      {
        section: 'asc',
      },
    ],
  });

  // Map the raw database results to a more frontend-friendly format.
  // This transformation aligns with the data structure your React component expects.
  const formattedClasses = classes.map((cls) => ({
    id: cls.class_id,
    name: cls.class_name,
    standard: cls.standard,
    section: cls.section,
    medium: cls.medium,
    capacity: cls.capacity,
    // Structure the teacher object as needed by the UI, handling cases where no teacher is assigned.
    teacher: cls.classTeacher
      ? {
          id: cls.classTeacher.employee_id,
          name: cls.classTeacher.full_name,
          avatar: cls.classTeacher.profile_avatar_url,
        }
      : null,
    // Provide student and subject counts directly, which is more efficient than sending full arrays.
    studentCount: cls._count.admissions,
    subjectCount: cls._count.courseOfferings,
  }));

  res.status(200).json(formattedClasses);
});

module.exports = {
  getClasses,
};