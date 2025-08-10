const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    View a single student's details
 * @route   GET /api/teacher/students/:studentId
 * @access  Private (Teacher)
 */
const viewStudentDetails = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;
  const { studentId } = req.params;

  if (!studentId) {
    res.status(400);
    throw new Error("Student ID is required.");
  }

  // Find the admission record for the student, but only if they belong to a class
  // where the current user is the class teacher. This is a crucial security check.
  const admission = await prisma.admission.findFirst({
    where: {
      student_id: studentId,
      class: {
        class_teacher_id: employeeId,
      },
    },
    include: {
      class: true, // For standard, section, medium
      student: {
        include: {
          details: true, // For UID, Aadhar, birth place, category
          family_details: true, // For parent details
          previous_academic_details: true, // For last school
          addresses: {
            // Fetching the first address as primary
            take: 1,
          },
        },
      },
    },
  });

  // If no admission record is found, it means the student either doesn't exist
  // or is not in the teacher's assigned class.
  if (!admission || !admission.student) {
    res.status(404);
    throw new Error("Student not found in your assigned class.");
  }

  const { student, class: studentClass } = admission;

  // Formatting the date to DD-MM-YYYY
  const formattedDob = new Date(student.dob).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '-');

  // Structuring the response to match the frontend fields
  const studentProfile = {
    fullName: `${student.first_name || ''} ${student.details?.middle_name || ''} ${student.last_name || ''}`.trim(),
    grNumber: admission.gr_number,
    standard: `${studentClass.standard} (${studentClass.medium}) - ${studentClass.section}`,
    rollNo: admission.roll_number,
    parentName: student.family_details?.father_name,
    birthDate: formattedDob,
    fatherMobile: student.family_details?.father_contact_number,
    motherMobile: student.family_details?.mother_contact_number,
    address: student.addresses[0] ? 
      `${student.addresses[0].address_line}, ${student.addresses[0].village}, ${student.addresses[0].taluka}, ${student.addresses[0].district}`.trim() : 
      null,
    UIDNo: student.details?.uid_number,
    aadharNo: student.details?.aadhar_number,
    birthPlace: student.details?.birth_place,
    category: student.details?.reservation_category,
    lastSchool: student.previous_academic_details?.previous_school_name,
    profileAvatarUrl: student.profile_avatar_url, // Added avatar URL
  };

  res.status(200).json(studentProfile);
});

module.exports = {
  viewStudentDetails
}
