const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @description Get teacher profile
 * @route GET /api/teacher/profile
 * @access Private
 */
const getProfileController = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;

  if (!employeeId) {
    res.status(401);
    throw new Error('Not authorized, no employee ID found');
  }

  const teacherProfile = await prisma.employee.findUnique({
    where: {
      employee_id: employeeId,
    },
    select: {
      employee_code: true,
      full_name: true,
      email: true,
      phone_number: true,
      gender: true,
      dob: true,
      address: true,
      highest_qualification: true,
      years_of_experience: true,
      joining_date: true,
      role: true,
      profile_avatar_url: true,
      department: {
        select: {
          department_name: true,
        },
      },
    },
  });

  if (!teacherProfile) {
    res.status(404);
    throw new Error('Teacher profile not found');
  }

  // NOTE: The frontend component uses mock data for some fields (e.g., emergency contact, Aadhar, PAN).
  // The backend provides the data available in the Prisma schema.
  // Additional fields can be added to the schema and this controller as needed.

  const formattedProfile = {
    name: teacherProfile.full_name,
    avatar: teacherProfile.profile_avatar_url,
    employeeId: teacherProfile.employee_code,
    role: teacherProfile.role,
    department: teacherProfile.department?.department_name || 'N/A',
    email: teacherProfile.email,
    phoneNumber: teacherProfile.phone_number || 'N/A',
    emergencyContact: 'N/A', // This field is not in the Employee model
    dob: teacherProfile.dob ? new Date(teacherProfile.dob).toLocaleDateString('en-GB') : 'N/A',
    bloodGroup: 'N/A', // This field is not in the Employee model
    address: teacherProfile.address || 'N/A',
    aadharNumber: 'N/A', // This field is not in the Employee model
    panNumber: 'N/A', // This field is not in the Employee model
    qualification: teacherProfile.highest_qualification || 'N/A',
    experience: `${teacherProfile.years_of_experience || 0} Years`,
    joiningDate: teacherProfile.joining_date ? new Date(teacherProfile.joining_date).toLocaleDateString('en-GB') : 'N/A',
  };

  res.status(200).json(formattedProfile);
});

module.exports = {
  getProfileController,
};