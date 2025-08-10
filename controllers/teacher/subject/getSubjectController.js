const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

/**
 * @description   Get all subjects taught by the logged-in teacher
 * @route         GET /api/teacher/subjects
 * @access        Private (Teacher)
 */
const getSubjectsByTeacher = asyncHandler(async (req, res) => {
  // The employeeId is extracted from the req.user object.
  // This is populated by the authentication middleware.
  const { employeeId } = req.user;

  if (!employeeId) {
    res.status(401);
    throw new Error('Not authorized, no employee ID found');
  }

  // Find all course offerings assigned to the specified teacher.
  // We include the related 'subject' and 'class' details to get their names.
  const courseOfferings = await prisma.courseOffering.findMany({
    where: {
      teacher_id: employeeId,
    },
    include: {
      subject: true, // Include subject details (name, code, etc.)
      class: true,     // Include class details (name, standard, etc.)
    },
  });

  // If no subjects are found for the teacher, return an empty array.
  if (!courseOfferings || courseOfferings.length === 0) {
    return res.status(200).json([]);
  }

  // Map the retrieved course offerings to a more frontend-friendly format.
  // This structure matches the one expected by the provided frontend component.
  const subjects = courseOfferings.map(offering => ({
    id: offering.course_offering_id, // Using course_offering_id as a unique identifier for each entry
    name: offering.subject.subject_name,
    class: offering.class.class_name,
  }));

  res.status(200).json(subjects);
});

module.exports = {
  getSubjectsByTeacher,
};