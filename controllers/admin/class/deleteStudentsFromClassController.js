const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Remove a student from a class (deletes the admission record)
 * @route   DELETE /api/admin/classes/:classId/students/:studentId
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with a success message or an error.
 *
 * @example req.params
 * {
 *   "classId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 *   "studentId": "s1t2u3d4-e5n6-t789-0123-456789abcdef"
 * }
 *
 * @example res.json (Success)
 * {
 *   "message": "Student removed from class successfully"
 * }
 */
const deleteStudentFromClass = asyncHandler(async (req, res) => {
  const { classId, studentId } = req.params;

  // We use `deleteMany` because it allows us to specify the class and student IDs
  // in the `where` clause, which is more direct than finding the admission_id first.
  const result = await prisma.admission.deleteMany({
    where: {
      class_id: classId,
      student_id: studentId,
    },
  });

  // `deleteMany` returns a `count` of deleted records. If the count is 0,
  // it means no matching admission record was found.
  if (result.count === 0) {
    res.status(404);
    throw new Error('Admission record not found. The student may not be enrolled in this class.');
  }

  res.status(200).json({ message: 'Student removed from class successfully' });
});

module.exports = {
  deleteStudentFromClass,
};