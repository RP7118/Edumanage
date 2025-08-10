const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');
const prisma = new PrismaClient();

/**
 * @desc    Create a new class
 * @route   POST /api/admin/classes
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. The body should contain the class data.
 * @param {object} res - Express response object.
 *
 * @example req.body
 * {
 *   "class_name": "10th A",
 *   "academic_year_id": "uuid-here",
 *   "standard": "10",
 *   "section": "A",
 *   "medium": "English",
 *   "capacity": 40,
 *   "class_teacher_id": "uuid-here" // optional
 * }
 */
const createClass = asyncHandler(async (req, res) => {
  const {
    class_name,
    academic_year_id,
    standard,
    section,
    medium,
    capacity,
    class_teacher_id
  } = req.body;

  // --- 1. Basic Validation ---
  if (
    !class_name ||
    !academic_year_id ||
    !standard ||
    !section ||
    !medium ||
    (capacity === undefined || capacity === null)
  ) {
    res.status(400);
    throw new Error("class_name, academic_year_id, standard, section, medium, and capacity are required.");
  }

  // Validate capacity
  if (typeof capacity !== "number" || capacity <= 0) {
    res.status(400);
    throw new Error("'capacity' must be a positive integer.");
  }

  // Validate enum for medium
  const validMediums = ['English', 'Hindi', 'Gujarati'];
  if (!validMediums.includes(medium)) {
    res.status(400);
    throw new Error(`'medium' must be one of: ${validMediums.join(', ')}.`);
  }

  // --- 2. Foreign Key Checks ---
  // Check academic_year_id exists
  const academicYear = await prisma.academicYear.findUnique({
    where: { academic_year_id }
  });
  if (!academicYear) {
    res.status(404);
    throw new Error("The provided academic_year_id does not exist.");
  }

  // If class_teacher_id is provided, check it exists and is a teacher/admin
  let classTeacher = null;
  if (class_teacher_id) {
    classTeacher = await prisma.employee.findUnique({
      where: { employee_id: class_teacher_id }
    });
    if (!classTeacher) {
      res.status(404);
      throw new Error("The provided class_teacher_id does not exist.");
    }
    if (!['teacher', 'admin'].includes(classTeacher.role)) {
      res.status(400);
      throw new Error("The provided class_teacher_id must be an employee with role 'teacher' or 'admin'.");
    }
  }

  // --- 3. Unique Constraint Check ---
  const existingClass = await prisma.class.findFirst({
    where: {
      academic_year_id,
      standard,
      section,
      medium
    }
  });
  if (existingClass) {
    res.status(409);
    throw new Error("A class with the same academic year, standard, section, and medium already exists.");
  }

  // --- 4. Create Class ---
  try {
    const newClass = await prisma.class.create({
      data: {
        class_name,
        academic_year_id,
        standard,
        section,
        medium,
        capacity,
        class_teacher_id: classTeacher ? classTeacher.employee_id : null
      }
    });

    res.status(201).json({
      message: "Class created successfully.",
      data: newClass
    });
  } catch (error) {
    // --- 5. Error Handling ---
    if (error.code === "P2002") { // Unique constraint failed
      res.status(409);
      throw new Error("A class with the same academic year, standard, section, and medium already exists.");
    } else if (error.code === "P2003") { // Foreign key failed
      res.status(400);
      throw new Error("Invalid foreign key reference.");
    } else if (error.name === "PrismaClientValidationError") {
      res.status(400);
      throw new Error("Invalid data provided. Please check your input.");
    } else {
      console.error("Failed to create class:", error);
      res.status(500);
      throw new Error("An unexpected error occurred while creating the class.");
    }
  }
});

module.exports = {
  createClass,
};