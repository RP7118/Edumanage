const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

/**
 * @description   Get details for a single subject (course offering)
 * @route         GET /api/teacher/subjects/:id
 * @access        Private (Teacher)
 */
const getSubjectDetails = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;
  // The 'id' from the route parameter is the unique course_offering_id
  const { id: courseOfferingId } = req.params;

  if (!employeeId) {
    res.status(401);
    throw new Error('Not authorized, no employee ID found');
  }

  // Find the specific course offering by its ID.
  // Crucially, we also ensure it is assigned to the logged-in teacher.
  // This prevents teachers from accessing details of subjects they don't teach.
  const courseOffering = await prisma.courseOffering.findFirst({
    where: {
      course_offering_id: courseOfferingId, // Correctly use the ID from the route
      teacher_id: employeeId,
    },
    include: {
      subject: true, // Get subject name and code
      class: true,   // Get class name and other details
      materials: {   // Get all associated course materials
        select: {
          material_id: true,
          material_name: true,
          file_url: true,
          uploaded_at: true,
        }
      },
      enrollments: { // Get the list of enrolled students
        include: {
          student: {
            select: {
              student_id: true,
              first_name: true,
              last_name: true,
              profile_avatar_url: true,
            }
          }
        }
      }
    }
  });

  // If no course offering is found, it means either the ID is invalid
  // or the teacher is not authorized to view it.
  if (!courseOffering) {
    res.status(404);
    throw new Error('Subject not found or you are not authorized to view it.');
  }

  // Format the response to be clean and structured for the frontend.
  const subjectDetails = {
    id: courseOffering.course_offering_id,
    subjectName: courseOffering.subject.subject_name,
    subjectCode: courseOffering.subject.subject_code || 'N/A',
    className: courseOffering.class.class_name,
    classDetails: {
        standard: courseOffering.class.standard,
        section: courseOffering.class.section,
        medium: courseOffering.class.medium,
    },
    // CHANGED: Mapped materials to use camelCase for frontend consistency
    materials: courseOffering.materials.map(material => ({
      id: material.material_id,
      name: material.material_name,
      fileUrl: material.file_url,
      uploadedAt: material.uploaded_at,
    })),
    students: courseOffering.enrollments.map(enrollment => ({
      id: enrollment.student.student_id,
      name: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
      avatarUrl: enrollment.student.profile_avatar_url,
    })),
  };

  res.status(200).json(subjectDetails);
});

module.exports = {
  getSubjectDetails,
};