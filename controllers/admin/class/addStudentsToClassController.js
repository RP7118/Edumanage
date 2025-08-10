const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Add one or more students to a specific class
 * @route   POST /api/admin/classes/:classId/students
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
 *   "studentIds": [
 *     "student-uuid-1",
 *     "student-uuid-2"
 *   ]
 * }
 *
 * @example res.json (Success)
 * {
 *   "message": "2 students added to the class successfully.",
 *   "count": 2
 * }
 */
const addStudentsToClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { studentIds } = req.body;

  // 1. Basic validation of the incoming request body
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400);
    throw new Error('studentIds must be a non-empty array.');
  }

  try {
    // 2. Use a transaction to ensure all operations succeed or none do.
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Fetch the class details, including its capacity and current student count.
      const classData = await tx.class.findUnique({
        where: { class_id: classId },
        include: {
          _count: {
            select: { admissions: true },
          },
        },
      });

      if (!classData) {
        // Throwing an error inside a transaction will automatically roll it back.
        throw new Error('Class not found.');
      }

      // Step B: Check if adding the new students would exceed the class capacity.
      const currentStudentCount = classData._count.admissions;
      const newStudentsCount = studentIds.length;
      if (currentStudentCount + newStudentsCount > classData.capacity) {
        throw new Error(
          `Cannot add students. Class capacity of ${classData.capacity} would be exceeded.`
        );
      }

      // Step C: Check if any of the students are already admitted to ANY class
      // in the same academic year. This prevents a student from being in two classes at once.
      const existingAdmissions = await tx.admission.findMany({
        where: {
          student_id: { in: studentIds },
          class: {
            academic_year_id: classData.academic_year_id,
          },
        },
        select: {
          student_id: true,
        },
      });

      if (existingAdmissions.length > 0) {
        const alreadyAdmittedIds = existingAdmissions.map((a) => a.student_id);
        throw new Error(
          `One or more students are already enrolled in a class for this academic year. Student IDs: ${alreadyAdmittedIds.join(
            ', '
          )}`
        );
      }

      // Step D: Prepare the data for the new admission records.
      const admissionDate = new Date();
      const admissionsToCreate = studentIds.map((studentId, index) => {
        const timestamp = Date.now() + index; // Ensure uniqueness for batch creation
        return {
          student_id: studentId,
          class_id: classId,
          admission_date: admissionDate,
          // NOTE: In a real-world app, you'd have a more robust system for generating these numbers.
          admission_number: `ADM-${timestamp}`,
          gr_number: `GR-${timestamp}`,
        };
      });

      // Step E: Create all the new admission records in a single batch query.
      return tx.admission.createMany({
        data: admissionsToCreate,
      });
    });

    res.status(201).json({
      message: `${result.count} students added to the class successfully.`,
      count: result.count,
    });
  } catch (error) {
    // The transaction failed. Send a clear error message.
    res.status(400); // Bad Request is appropriate for validation failures
    throw new Error(error.message);
  }
});

module.exports = {
  addStudentsToClass,
};