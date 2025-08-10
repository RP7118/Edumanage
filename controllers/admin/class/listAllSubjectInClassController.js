const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

/**
 * @desc    Get a list of all subjects assigned to a specific class
 * @route   GET /api/admin/classes/:classId/subjects
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with an array of subject objects.
 *
 * @example req.params
 * {
 *   "classId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example res.json
 * [
 *   {
 *     "id": "sub1-ject-2345-6789-0abcdef12345",
 *     "name": "Mathematics",
 *     "teacher": {
 *       "id": "t1e2a3c4-h5e6-r789-0123-456789abcdef",
 *       "name": "Jane Doe",
 *       "avatar": "https://example.com/avatars/jane_doe.png"
 *     },
 *     "materialsAvailable": true,
 *     "quizAvailable": false
 *   }
 * ]
 */
const listAllSubjectsInClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // Ensure the class exists.
  const classExists = await prisma.class.findUnique({
    where: { class_id: classId },
  });

  if (!classExists) {
    res.status(404);
    throw new Error("Class not found.");
  }

  // Fetch all course offerings for the class.
  const offerings = await prisma.courseOffering.findMany({
    where: {
      class_id: classId,
    },
    select: {
      subject: {
        select: {
          subject_id: true,
          subject_name: true,
        },
      },
      teacher: {
        select: {
          employee_id: true,
          full_name: true,
          profile_avatar_url: true,
        },
      },
      _count: {
        select: { materials: true },
      },
    },
    orderBy: {
      subject: {
        subject_name: "asc",
      },
    },
  });

  // Map the data to the frontend's expected format.
  const formattedSubjects = offerings.map((offering) => ({
    id: offering.subject.subject_id,
    name: offering.subject.subject_name,
    teacher: offering.teacher
      ? {
          id: offering.teacher.employee_id,
          name: offering.teacher.full_name,
          avatar: offering.teacher.profile_avatar_url,
        }
      : null,
    materialsAvailable: offering._count.materials > 0,
    quizAvailable: false, // Placeholder as 'quiz' is not in the schema
  }));

  res.status(200).json(formattedSubjects);
});

module.exports = {
  listAllSubjectsInClass,
};
