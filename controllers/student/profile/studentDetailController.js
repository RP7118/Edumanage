// File Path: backend/controllers/student/profile/profileController.js

const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc     Get the full profile for the logged-in student
 * @route    GET /api/student/profile
 * @access   Private (Student)
 */
const getFullStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  // 1. Fetch all required data in a single query
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
          dob: true,
          details: {
            select: {
              middle_name: true,
              birth_place: true,
              reservation_category: true,
              aadhar_number: true,
            },
          },
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
              mother_contact_number: true,
            },
          },
          addresses: {
            take: 1, // Assuming the first address is the primary one
            select: {
              address_line: true,
              village: true,
              taluka: true,
            },
          },
          previous_academic_details: {
            select: {
              previous_school_name: true,
              school_udise_code: true,
            },
          },
          payment_details: {
            select: {
              bank_name: true,
              account_number: true,
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

  // 2. Helper functions for formatting
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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

  // Constructing the full name as per the dummy data format (LastName FirstName FatherName)
  const fullName = [
    studentData.last_name,
    studentData.first_name,
    familyDetails?.father_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  const standard = classInfo
    ? `${classInfo.standard} (${getMediumAbbreviation(classInfo.medium)}) -${classInfo.section}`
    : null;
    
  // Address is constructed to match the simple format in dummy data
  const address = [
    addressInfo?.address_line,
    addressInfo?.taluka
  ]
    .filter(Boolean)
    .join(' ');


  // 4. Create the final profile object
  const profile = {
    name: fullName,
    grNo: admission?.gr_number || null,
    standard: standard,
    rollNo: admission?.roll_number || null,
    parentsName: familyDetails?.father_name?.toUpperCase() || null,
    birthDate: formatDate(studentData.dob),
    fatherMobile: familyDetails?.father_contact_number || null,
    motherMobile: familyDetails?.mother_contact_number || null,
    address: address || null,
    aadharDiseNo: studentData.previous_academic_details?.school_udise_code || null,
    aadharNo: studentData.details?.aadhar_number || null,
    birthPlace: studentData.details?.birth_place || null,
    category: studentData.details?.reservation_category || 'General',
    lastSchool: studentData.previous_academic_details?.previous_school_name || null,
    bankName: studentData.payment_details?.bank_name || null,
    accountNumber: studentData.payment_details?.account_number || null,
  };

  res.status(200).json(profile);
});

module.exports = {
  getFullStudentProfile,
};