const { PrismaClient } = require("../../../generated/prisma");
const asyncHandler = require("express-async-handler");
const prisma = new PrismaClient();

/**
 * @desc    Remove a student's enrollment from a subject
 * @route   DELETE /api/admin/subjects/:subjectId/students/:studentId
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example req.params
 * {
 *   "subjectId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 *   "studentId": "f0e9d8c7-b6a5-4321-fedc-ba9876543210"
 * }
 *
 * @example res.body (Success 200)
 * {
 *   "message": "Student removed from subject successfully."
 * }
 *
 * @example res.body (Error 404)
 * {
 *   "message": "Enrollment not found for this student and subject."
 * }
 */
const deleteStudentFromSubject = asyncHandler(async (req, res) => {
  const { subjectId, studentId } = req.params;

  if (!subjectId || !studentId) {
    res.status(400);
    throw new Error("Subject ID and Student ID are required.");
  }

  // The core logic is to delete the enrollment record that links the student
  // to a course offering of the specified subject.
  const result = await prisma.studentCourseEnrollment.deleteMany({
    where: {
      student_id: studentId,
      // We target the enrollment through its relation to a course offering
      // that is tied to the given subjectId.
      courseOffering: {
        subject_id: subjectId,
      },
    },
  });

  // The 'deleteMany' operation returns a 'count' of the records deleted.
  // If the count is 0, it means no matching enrollment was found.
  if (result.count === 0) {
    res.status(404);
    throw new Error("Enrollment not found for this student and subject.");
  }

  res
    .status(200)
    .json({ message: "Student removed from subject successfully." });
});

module.exports = { deleteStudentFromSubject };
