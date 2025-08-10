const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Add one or more subjects to a specific class
 * @route   POST /api/admin/classes/:classId/subjects
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with a success message and count, or an error.
 *
 * @example req.params
 * {
 *   "classId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example req.body
 * {
 *   "subjectIds": [
 *     "subject-uuid-1",
 *     "subject-uuid-2"
 *   ]
 * }
 *
 * @example res.json (Success)
 * {
 *   "message": "2 subjects added to the class successfully.",
 *   "count": 2
 * }
 */
const addSubjectsToClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { subjectIds } = req.body;

  // 1. Basic validation of the incoming request body
  if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
    res.status(400);
    throw new Error('subjectIds must be a non-empty array.');
  }

  try {
    // 2. Use a transaction to ensure atomicity.
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Verify that the class exists.
      const classExists = await tx.class.findUnique({
        where: { class_id: classId },
        select: { class_id: true }, // We only need to confirm its existence.
      });

      if (!classExists) {
        // Abort the transaction if the class is not found.
        throw new Error('Class not found.');
      }

      // Step B: Check if any of the selected subjects are already assigned to this class.
      const existingOfferings = await tx.courseOffering.findMany({
        where: {
          class_id: classId,
          subject_id: { in: subjectIds },
        },
        select: { subject_id: true },
      });

      if (existingOfferings.length > 0) {
        const existingSubjectIds = existingOfferings.map((o) => o.subject_id);
        throw new Error(
          `One or more subjects are already assigned to this class. Subject IDs: ${existingSubjectIds.join(
            ', '
          )}`
        );
      }

      // Step C: Prepare the data for creating the new CourseOffering records.
      const offeringsToCreate = subjectIds.map((subjectId) => ({
        class_id: classId,
        subject_id: subjectId,
        // teacher_id is optional and can be assigned later.
        // is_mandatory defaults to true as per the schema.
      }));

      // Step D: Create all the new course offerings in a single batch query.
      return tx.courseOffering.createMany({
        data: offeringsToCreate,
      });
    });

    res.status(201).json({
      message: `${result.count} subjects added to the class successfully.`,
      count: result.count,
    });
  } catch (error) {
    // The transaction failed. Send a clear error message.
    // This will catch errors from any step inside the transaction.
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  addSubjectsToClass,
};