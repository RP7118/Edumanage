const { PrismaClient } = require("../../../generated/prisma");
const asyncHandler = require("express-async-handler");
const prisma = new PrismaClient();

/**
 * @desc    Delete a subject by its ID
 * @route   DELETE /api/admin/subjects/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example req.params
 * { "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef" }
 *
 * @example res.body (Success 200)
 * {
 *   "message": "Subject deleted successfully."
 * }
 *
 * @example res.body (Error 400 - Dependency Found)
 * {
 *   "message": "Cannot delete subject. It is assigned to one or more classes. Please remove it from all classes first."
 * }
 *
 * @example res.body (Error 404 - Not Found)
 * {
 *   "message": "Subject not found."
 * }
 */
const deleteSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("Subject ID is required.");
  }

  // --- Dependency Check ---
  // Before attempting to delete the subject, we must check if it's linked to any
  // course offerings. The schema's `onDelete: Restrict` rule would cause a
  // database error if we tried to delete a subject that is in use.
  const existingOffering = await prisma.courseOffering.findFirst({
    where: {
      subject_id: id,
    },
  });

  if (existingOffering) {
    res.status(400); // 400 Bad Request or 409 Conflict are appropriate.
    throw new Error(
      "Cannot delete subject. It is assigned to one or more classes. Please remove it from all classes first."
    );
  }

  // --- Deletion ---
  // If no dependencies are found, it is safe to delete the subject.
  try {
    await prisma.subject.delete({
      where: {
        subject_id: id,
      },
    });
  } catch (error) {
    // Prisma's `delete` throws a P2025 error if the record is not found.
    // We can catch this specific error to provide a clean 404 response.
    if (error.code === "P2025") {
      res.status(404);
      throw new Error("Subject not found.");
    }
    // Re-throw other unexpected errors to be handled by the global error handler.
    throw error;
  }

  res.status(200).json({ message: "Subject deleted successfully." });
});

module.exports = { deleteSubject };
