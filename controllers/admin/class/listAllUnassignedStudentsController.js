const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

/**
 * @desc    Get a list of all students who are not assigned to any class
 * @route   GET /api/admin/students/unassigned
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with an array of unassigned student objects.
 *
 * @example res.json
 * [
 * {
 * "id": "s1t2u3d4-e5n6-t789-0123-456789abcdef",
 * "name": "Jane Doe",
 * "avatar": "https://example.com/avatars/jane_doe.png",
 * "gender": "female",
 * "parentName": "John Doe",
 * "contact": "123-456-7890",
 * "status": "active"
 * }
 * ]
 */
const listAllUnassignedStudents = asyncHandler(async (req, res) => {
  // Fetch all students who do not have any corresponding entry in the Admission table.
  const unassignedStudents = await prisma.student.findMany({
    where: {
      admissions: {
        none: {},
      },
    },
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
    orderBy: {
      first_name: "asc",
    },
  });

  // Map the data to a more frontend-friendly format.
  const formattedStudents = unassignedStudents.map((student) => ({
    id: student.student_id,
    name: `${student.first_name} ${student.last_name}`,
    avatar: student.profile_avatar_url,
    gender: student.gender,
    parentName: student.family_details?.father_name || "N/A",
    contact: student.family_details?.father_contact_number || "N/A",
    status: student.status,
  }));

  res.status(200).json(formattedStudents);
});

module.exports = {
  listAllUnassignedStudents
};