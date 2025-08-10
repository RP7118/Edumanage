const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');


const prisma = new PrismaClient();

/**
 * @desc    Create or Update the School Configuration
 * @route   POST /api/admin/school/configuration
 * @access  Private (Requires Admin Role)
 *
 * @summary This controller manages the school's core settings. Since there should
 * only ever be one configuration record for the entire school, this
 * function performs an "upsert" operation. It checks if a configuration
 * record already exists. If it does, it updates it. If not, it creates it.
 */
const schoolConfiguration = asyncHandler(async (req, res) => {
  // --- 1. Data Mapping & Validation ---
  // Destructure all expected fields from the frontend request body.
  const {
    name,
    logo,
    motto,
    email,
    phone,
    website,
    address,
    type,
    board,
    registrationNumber,
    accreditationInfo,
    academicYear,
    gradingSystem,
    terms,
    timing,
  } = req.body;

  // Perform essential backend validation.
  // While the frontend has checks, the backend must always validate incoming data.
  if (!name || !email || !phone || !type || !board || !registrationNumber || !address) {
    res.status(400); // Bad Request
    throw new Error('Please provide all required school configuration fields.');
  }

  // --- 2. Prepare Data Payload for Prisma ---
  // Map the camelCase frontend field names to the snake_case schema names.
  // This object will be used for both creating and updating the record.
  const configData = {
    school_name: name,
    logo_url: logo, // The frontend should provide a URL to the stored logo image.
    motto: motto,
    email: email,
    contact_numbers: phone, // Maps directly to String[]
    website_url: website,
    address: address, // The address object is stored directly in the JSONB field.
    school_type: type,
    affiliation_board: board,
    registration_number: registrationNumber,
    accreditation_info: accreditationInfo,
    // Safely handle date conversions, defaulting to null if not provided.
    academic_year_start: academicYear?.start ? new Date(academicYear.start) : null,
    academic_year_end: academicYear?.end ? new Date(academicYear.end) : null,
    grading_system: gradingSystem,
    term_count: terms?.count ? parseInt(terms.count, 10) : 2,
    term_names: terms?.names || [], // Default to an empty array if not provided.
    // For TIME fields, create a full Date object; Prisma/Postgres will correctly store only the time part.
    class_start_time: timing?.start ? new Date(`1970-01-01T${timing.start}:00Z`) : null,
    class_end_time: timing?.end ? new Date(`1970-01-01T${timing.end}:00Z`) : null,
  };

  // --- 3. Find Existing Configuration ---
  // As this table should only have one row, we fetch the first record we find.
  const existingConfig = await prisma.schoolConfiguration.findFirst({});

  let schoolConfig;
  let statusCode;

  // --- 4. Upsert Logic ---
  if (existingConfig) {
    // If a record exists, update it using its unique ID.
    schoolConfig = await prisma.schoolConfiguration.update({
      where: { school_config_id: existingConfig.school_config_id },
      data: configData,
    });
    statusCode = 200; // OK
  } else {
    // If no record exists, create a new one.
    schoolConfig = await prisma.schoolConfiguration.create({
      data: configData,
    });
    statusCode = 201; // Created
  }

  // --- 5. Send Response ---
  res.status(statusCode).json({
    message: `School configuration successfully ${existingConfig ? 'updated' : 'created'}.`,
    data: schoolConfig,
  });
});

module.exports = { schoolConfiguration };
