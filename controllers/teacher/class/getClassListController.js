const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

/**
 * @description   Fetch all classes assigned to a class teacher
 * @route         GET /api/teacher/classes
 * @access        Private (Teacher)
 */
const getTeacherClasses = asyncHandler(async (req, res) => {
  // The teacher's employeeId is retrieved from the authenticated user session
  const { employeeId } = req.user;

  if (!employeeId) {
    res.status(400);
    throw new Error('Employee ID not found in user token.');
  }

  // Find all classes where the current teacher is the class_teacher
  const classes = await prisma.class.findMany({
    where: {
      class_teacher_id: employeeId,
      // Optional: you might want to only pull classes from the active academic year
      // academicYear: {
      //   is_active: true,
      // }
    },
    select: {
      class_id: true,
      class_name: true,
      standard: true,
      section: true,
      medium: true,
    },
    orderBy: {
      class_name: 'asc',
    },
  });

  if (!classes || classes.length === 0) {
    res.status(404);
    throw new Error('No classes found where you are assigned as the class teacher.');
  }

  res.status(200).json(classes);
});

module.exports = { getTeacherClasses };