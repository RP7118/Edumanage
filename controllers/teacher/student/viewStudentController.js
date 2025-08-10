const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    View students of the class the teacher is a class teacher of
 * @route   GET /api/teacher/students
 * @access  Private (Teacher)
 */
const viewStudents = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;

  // Find the class where the logged-in teacher is the class teacher
  const assignedClass = await prisma.class.findFirst({
    where: {
      class_teacher_id: employeeId,
    },
  });

  if (!assignedClass) {
    res.status(404);
    throw new Error("You are not assigned as a class teacher to any class.");
  }

  // Find all students who have an admission record for the assigned class.
  // This approach directly fetches students and includes their specific admission details (Roll No, GR No) for that class.
  const students = await prisma.student.findMany({
    where: {
      admissions: {
        some: {
          class_id: assignedClass.class_id,
        },
      },
    },
    include: {
      admissions: {
        // Filter the included admissions to only get the record for the relevant class.
        where: {
          class_id: assignedClass.class_id,
        },
        // Select only the necessary fields to match the frontend's 'StudentListItem' type.
        select: {
          roll_number: true,
          gr_number: true,
        },
      },
    },
    orderBy: {
        first_name: 'asc'
    }
  });

  res.status(200).json({
    message: `Students for class: ${assignedClass.class_name}`,
    classDetails: {
        className: assignedClass.class_name,
        standard: assignedClass.standard,
        section: assignedClass.section,
        medium: assignedClass.medium,
    },
    students, // The 'students' array now has the required structure with nested admission details.
  });
});

module.exports = {
  viewStudents,
};