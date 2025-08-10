const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

/**
 * @desc    Get a list of all subjects available to be added to a specific class
 * @route   GET /api/admin/classes/:classId/available-subjects
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with an array of available subject objects.
 *
 * @example req.params
 * {
 * "classId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example res.json
 * [
 * {
 * "id": "subj-123-abc",
 * "name": "History",
 * "code": "HIST-101"
 * },
 * {
 * "id": "subj-456-def",
 * "name": "Geography",
 * "code": "GEO-101"
 * }
 * ]
 */
const listAvailableSubjectsForClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // 1. First, ensure the class exists to provide a clear error message.
  const classExists = await prisma.class.findUnique({
    where: { class_id: classId },
  });

  if (!classExists) {
    res.status(404);
    throw new Error("Class not found.");
  }

  // 2. Fetch all subjects that are NOT linked to the given classId
  //    via the CourseOffering table.
  const availableSubjects = await prisma.subject.findMany({
    where: {
      courseOfferings: {
        none: {
          class_id: classId,
        },
      },
    },
    orderBy: {
      subject_name: "asc",
    },
  });

  // 3. Map the data to a more frontend-friendly format.
  const formattedSubjects = availableSubjects.map((subject) => ({
    id: subject.subject_id,
    name: subject.subject_name,
    code: subject.subject_code,
  }));

  res.status(200).json(formattedSubjects);
});

module.exports = {
  listAvailableSubjectsForClass,
};