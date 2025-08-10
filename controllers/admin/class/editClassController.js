const asyncHandler = require('express-async-handler');
const { PrismaClient, Prisma } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Update an existing class
 * @route   PUT /api/admin/classes/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. The body should contain the updated class data.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with the updated class object or an error.
 *
 * @example req.params
 * {
 *   "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example req.body
 * {
 *   "name": "Class 10-A (Updated)",
 *   "standard": "10",
 *   "section": "A",
 *   "medium": "English",
 *   "capacity": 45,
 *   "teacherId": "new-teacher-uuid-here"
 * }
 *
 * @example res.json
 * {
 *   "class_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 *   "class_name": "Class 10-A (Updated)",
 *   "academic_year_id": "uuid-for-academic-year",
 *   "standard": "10",
 *   "section": "A",
 *   "medium": "English",
 *   "capacity": 45,
 *   "class_teacher_id": "new-teacher-uuid-here",
 *   "created_at": "2023-10-27T10:00:00.000Z",
 *   "updated_at": "2023-10-27T12:30:00.000Z"
 * }
 */
const editClass = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, standard, section, medium, capacity, teacherId } = req.body;

  // 1. Backend Validation: Never trust the client.
  if (!name || !standard || !section || !medium || !capacity || !teacherId) {
    res.status(400);
    throw new Error(
      'Please provide all required fields: name, standard, section, medium, capacity, and teacherId'
    );
  }

  if (typeof capacity !== 'number' || capacity < 1) {
    res.status(400);
    throw new Error('Capacity must be a positive number.');
  }

  // Optional: Validate medium against the enum values if needed
  const validMediums = ['English', 'Hindi', 'Gujarati']; // As defined in your Prisma schema
  if (!validMediums.includes(medium)) {
    res.status(400);
    throw new Error(`Invalid medium. Must be one of: ${validMediums.join(', ')}`);
  }

  try {
    // 2. Prepare the data for Prisma, mapping frontend names to schema names.
    const dataToUpdate = {
      class_name: name,
      standard,
      section,
      medium, // Prisma client handles the enum type
      capacity,
      class_teacher_id: teacherId,
    };

    // 3. Attempt to update the class in the database
    const updatedClass = await prisma.class.update({
      where: {
        class_id: id,
      },
      data: dataToUpdate,
    });

    res.status(200).json(updatedClass);
  } catch (error) {
    // Handle specific Prisma error for "record not found"
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404);
      throw new Error('Class not found. Cannot update a non-existent class.');
    }
    // Let the async handler manage other potential errors
    throw error;
  }
});

module.exports = {
  editClass,
};