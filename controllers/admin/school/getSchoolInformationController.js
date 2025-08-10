const { PrismaClient } = require('../../../generated/prisma')
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

/**
 * @desc    Get the current School Configuration
 * @route   GET /api/v1/admin/school/configuration
 * @access  Private (Requires Admin Role)
 *
 * @summary Retrieves the single school configuration record. Since there is
 * only one settings document for the school, this fetches the first one found.
 * If no record exists, it returns a default empty structure to allow creation.
 */
const getSchoolConfiguration = asyncHandler(async (req, res) => {
  // --- 1. Fetch the Configuration ---
  const config = await prisma.SchoolConfiguration.findFirst({});

  // --- 2. Handle Not Found Gracefully ---
  // If no configuration exists, send back a default, empty object.
  // This allows the frontend to render the form for the initial setup.
  if (!config) {
    return res.status(200).json({
      message: 'No school configuration found. Ready for initial setup.',
      data: {
        name: '',
        logo: null,
        motto: '',
        email: '',
        phone: [''],
        website: '',
        address: { street: '', city: '', state: '', zip: '', country: '' },
        type: '',
        board: '',
        registrationNumber: '',
        accreditationInfo: '',
        academicYear: { start: '', end: '' },
        gradingSystem: 'marks',
        terms: { count: 2, names: ['Term 1', 'Term 2'] },
        timing: { start: '08:00', end: '15:00' },
      },
      isInitialSetup: true, // Flag to inform the frontend this is a new setup
    });
  }

  // --- 3. Map to Frontend-Friendly Format ---
  // Convert snake_case from DB to camelCase for the API response.
  const responseData = {
    name: config.school_name,
    logo: config.logo_url,
    motto: config.motto,
    email: config.email,
    phone: config.contact_numbers,
    website: config.website_url,
    address: config.address,
    type: config.school_type,
    board: config.affiliation_board,
    registrationNumber: config.registration_number,
    accreditationInfo: config.accreditation_info,
    academicYear: {
      start: config.academic_year_start ? config.academic_year_start.toISOString().split('T')[0] : '',
      end: config.academic_year_end ? config.academic_year_end.toISOString().split('T')[0] : '',
    },
    gradingSystem: config.grading_system,
    terms: {
      count: config.term_count,
      names: config.term_names,
    },
    timing: {
      start: config.class_start_time ? new Date(config.class_start_time).toISOString().substr(11, 5) : '',
      end: config.class_end_time ? new Date(config.class_end_time).toISOString().substr(11, 5) : '',
    },
    createdAt: config.created_at,
    updatedAt: config.updated_at
  };

  // --- 4. Send Response ---
  res.status(200).json({
    message: 'School configuration retrieved successfully.',
    data: responseData,
    isInitialSetup: false,
  });
});

module.exports = { getSchoolConfiguration };