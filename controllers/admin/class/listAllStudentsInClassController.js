const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

/**
 * @desc    Get a list of all students enrolled in a specific class
 * @route   GET /api/admin/classes/:classId/students
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with an array of student objects.
 *
 * @example req.params
 * {
 *   "classId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example res.json
 * [
 *   {
 *     "id": "s1t2u3d4-e5n6-t789-0123-456789abcdef",
 *     "name": "John Smith",
 *     "avatar": "https://example.com/avatars/john_smith.png",
 *     "regNo": "ADM-00123",
 *     "rollNo": "1",
 *     "gender": "male",
 *     "parentName": "Robert Smith",
 *     "contact": "987-654-3210",
 *     "status": "active"
 *   }
 * ]
 */
const listAllStudentsInClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // First, ensure the class exists to provide a clear error message.
  const classExists = await prisma.class.findUnique({
    where: { class_id: classId },
  });

  if (!classExists) {
    res.status(404);
    throw new Error("Class not found.");
  }

  // Fetch all admissions for the given class, including related student details.
  const admissions = await prisma.admission.findMany({
    where: {
      class_id: classId,
    },
    select: {
      admission_number: true,
      roll_number: true,
      student: {
        select: {
          student_id: true,
          first_name: true,
          last_name: true,
          profile_avatar_url: true,
          gender: true,
          status: true,
          family_details: {
            select: {
              father_name: true,
              father_contact_number: true,
            },
          },
        },
      },
    },
    orderBy: {
      student: {
        first_name: "asc",
      },
    },
  });

  // Map the data to the format expected by the frontend.
  const formattedStudents = admissions.map((admission) => ({
    id: admission.student.student_id,
    name: `${admission.student.first_name} ${admission.student.last_name}`,
    avatar: admission.student.profile_avatar_url,
    regNo: admission.admission_number,
    rollNo: admission.roll_number,
    gender: admission.student.gender,
    parentName: admission.student.family_details?.father_name || "N/A",
    contact: admission.student.family_details?.father_contact_number || "N/A",
    status: admission.student.status,
  }));

  res.status(200).json(formattedStudents);
});

module.exports = {
  listAllStudentsInClass,
};
