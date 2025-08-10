// File Path: backend/controllers/student/profile/basicInfoStudentController.js

const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc     Get the basic profile for the logged-in student
 * @route    GET /api/student/profile/basic-info
 * @access   Private (Student)
 */
const getBasicStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  // 1. Fetch only the data required for the basic profile
  const user = await prisma.user.findUnique({
    where: {
      user_id: userId,
      role: 'student',
    },
    select: {
      student: {
        select: {
          first_name: true,
          last_name: true,
          admissions: {
            orderBy: {
              admission_date: 'desc',
            },
            take: 1,
            select: {
              gr_number: true,
              roll_number: true,
              class: {
                select: {
                  standard: true,
                  section: true,
                  medium: true,
                },
              },
            },
          },
          family_details: {
            select: {
              father_name: true,
              father_contact_number: true,
            },
          },
          addresses: {
            take: 1,
            select: {
              address_line: true,
              taluka: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.student) {
    res.status(404);
    throw new Error('Student profile not found.');
  }

  const studentData = user.student;

  // 2. Helper function for formatting medium
  const getMediumAbbreviation = (medium) => {
    if (!medium) return '';
    switch (medium) {
      case 'English': return 'EM';
      case 'Gujarati': return 'GM';
      case 'Hindi': return 'HM';
      default: return medium.substring(0, 2).toUpperCase();
    }
  };

  // 3. Destructure and format data to match the frontend component
  const admission = studentData.admissions?.[0];
  const classInfo = admission?.class;
  const familyDetails = studentData.family_details;
  const addressInfo = studentData.addresses?.[0];

  const fullName = [
    studentData.last_name,
    studentData.first_name,
    familyDetails?.father_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  const standard = classInfo
    ? `${classInfo.standard} (${getMediumAbbreviation(classInfo.medium)})-${classInfo.section}`
    : null;
    
  const address = [
    addressInfo?.address_line,
    addressInfo?.taluka
  ]
    .filter(Boolean)
    .join(' ');

  // 4. Create the final basic profile object
  const basicProfile = {
    name: fullName,
    grNo: admission?.gr_number || null,
    standard: standard,
    rollNo: admission?.roll_number || null,
    mobile: familyDetails?.father_contact_number || null,
    address: address || null,
  };

  res.status(200).json(basicProfile);
});

module.exports = {
  getBasicStudentProfile
};