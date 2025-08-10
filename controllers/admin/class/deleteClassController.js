const asyncHandler = require('express-async-handler');
const { PrismaClient, Prisma } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Delete a class by its ID
 * @route   DELETE /api/admin/classes/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. The class ID should be in the URL parameters.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with a success message or an error.
 *
 * @example req.params
 * {
 *   "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example res.json (Success)
 * {
 *   "message": "Class deleted successfully"
 * }
 */
const deleteClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Attempt to delete the class from the database
    await prisma.class.delete({
      where: {
        class_id: id,
      },
    });

    res.status(200).json({ message: 'Class deleted successfully' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle "record to delete does not exist" error
      if (error.code === 'P2025') {
        res.status(404);
        throw new Error('Class not found.');
      }
      // Handle "foreign key constraint" error.
      // This happens if you try to delete a class that still has students admitted.
      // Your schema has `onDelete: Restrict` for the `Admission` model.
      if (error.code === 'P2003') {
        res.status(400); // Bad Request
        throw new Error(
          'Cannot delete this class because it has students enrolled. Please remove all students from the class first.'
        );
      }
    }
    // Let the async handler manage other potential errors
    throw error;
  }
});

module.exports = {
  deleteClass,
};