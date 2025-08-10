const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Remove a subject from a class (deletes the course offering)
 * @route   DELETE /api/admin/classes/:classId/subjects/:subjectId
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
 *   "subjectId": "sub1-ject-2345-6789-0abcdef12345"
 * }
 *
 * @example res.json (Success)
 * {
 *   "message": "Subject removed from class successfully"
 * }
 */
const deleteSubjectsFromClass = asyncHandler(async (req, res) => {
  const { classId, subjectId } = req.params;

  // Use `deleteMany` to target the specific course offering by class and subject.
  // Note: Deleting a CourseOffering will also cascade-delete related
  // StudentCourseEnrollments and CourseMaterials as per your schema.
  const result = await prisma.courseOffering.deleteMany({
    where: {
      class_id: classId,
      subject_id: subjectId,
    },
  });

  // If no records were deleted, the subject was not assigned to the class.
  if (result.count === 0) {
    res.status(404);
    throw new Error('Subject offering not found. The subject may not be assigned to this class.');
  }

  res.status(200).json({ message: 'Subject removed from class successfully' });
});

module.exports = {
  deleteSubjectsFromClass,
};