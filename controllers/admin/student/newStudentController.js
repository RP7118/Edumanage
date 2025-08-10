// Import necessary packages, modules, and Prisma Enums
const { PrismaClient, user_role_enum } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');

// Initialize Prisma Client
const prisma = new PrismaClient();

// --- HELPER FUNCTIONS ---

/**
 * Generates a random 8-character password containing letters, numbers, and special characters.
 * @returns {string} The randomly generated password.
 */
function generateRandomPassword() {
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&?";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
}

/**
 * Generates a unique username for a student.
 * Starts with `firstname.lastname` and appends a counter if the username already exists.
 * @param {object} tx - The Prisma transaction client.
 * @param {string} firstName - The student's first name.
 * @param {string} lastName - The student's last name.
 * @returns {Promise<string>} The unique username.
 */
async function generateUniqueStudentUsername(tx, firstName, lastName) {
    const baseUsername = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`;
    let username = baseUsername;
    let counter = 0;
    let isUnique = false;

    while (!isUnique) {
        const existingUser = await tx.user.findUnique({ where: { username: username } });
        if (!existingUser) {
            isUnique = true;
        } else {
            counter++;
            username = `${baseUsername}${counter}`;
        }
    }
    return username;
}


/**
 * @desc    Create a new student with all related details and a user account
 * @route   POST /api/students
 * @access  Private (Admin)
 */
const createStudent = asyncHandler(async (req, res) => {
  const {
    classId,
    admissionDetails,
    studentInfo,
    studentDetails,
    familyDetails,
    address,
    previousAcademicDetails,
    paymentDetails,
    hostelDetails,
    facilities,
  } = req.body;

  // --- 1. Basic Validation ---
  if (!classId || !admissionDetails || !studentInfo) {
    res.status(400);
    throw new Error('classId, admissionDetails, and studentInfo are required.');
  }
  if (!admissionDetails.admission_number || !admissionDetails.gr_number) {
    res.status(400);
    throw new Error('Admission number and GR number are required.');
  }
  if (!studentInfo.first_name || !studentInfo.last_name) {
    res.status(400);
    throw new Error('First name and last name are required in studentInfo.');
  }

  try {
    // --- 2. Database Transaction ---
    const { completeStudent, password } = await prisma.$transaction(async (tx) => {
      
      const { first_name, last_name, dob, gender, profile_avatar_url, status } = studentInfo;

      // --- FIX: Explicitly create the User first, then the Student ---
      
      // Step A: Generate credentials for the new user.
      const username = await generateUniqueStudentUsername(tx, first_name, last_name);
      const randomPassword = generateRandomPassword();
      
      // Step B: Create the User record.
      const newUser = await tx.user.create({
        data: {
          username: username,
          password: randomPassword, // Storing plain-text password as requested.
          role: user_role_enum.student,
        }
      });
      console.log("New user created:", newUser);
      // Step C: Create the Student record, explicitly linking the new user's ID.
      // This guarantees the foreign key 'students_user_id_fkey' is satisfied.
      const newStudent = await tx.student.create({
        data: {
          first_name,
          last_name,
          dob: new Date(dob),
          gender,
          profile_avatar_url,
          status,
          user_id: newUser.user_id, // Explicitly provide the foreign key from the created user.
        }
      });
      // --- END FIX ---

      // Step D: Create all associated one-to-one and one-to-many details.
      const studentId = newStudent.student_id;
      const creationPromises = [];

      creationPromises.push(
        tx.admission.create({ data: { ...admissionDetails, student_id: studentId, class_id: classId, admission_date: new Date(admissionDetails.admission_date) } })
      );
      if (studentDetails) creationPromises.push(tx.studentDetails.create({ data: { ...studentDetails, student_id: studentId } }));
      if (familyDetails) creationPromises.push(tx.studentFamilyDetails.create({ data: { ...familyDetails, student_id: studentId } }));
      if (address) creationPromises.push(tx.studentAddress.create({ data: { ...address, student_id: studentId } }));
      if (previousAcademicDetails) creationPromises.push(tx.studentPreviousAcademicDetails.create({ data: { ...previousAcademicDetails, student_id: studentId } }));
      if (paymentDetails) creationPromises.push(tx.studentPaymentDetails.create({ data: { ...paymentDetails, student_id: studentId } }));
      if (hostelDetails) creationPromises.push(tx.studentHostelDetails.create({ data: { ...hostelDetails, student_id: studentId } }));
      if (facilities) creationPromises.push(tx.studentFacilities.create({ data: { ...facilities, student_id: studentId } }));
      
      await Promise.all(creationPromises);
      
      // Step E: Enroll the student in all mandatory courses for their class.
      const mandatoryCourses = await tx.courseOffering.findMany({ where: { class_id: classId, is_mandatory: true } });

      if (mandatoryCourses.length > 0) {
        await tx.studentCourseEnrollment.createMany({
          data: mandatoryCourses.map((course) => ({
            student_id: studentId,
            course_offering_id: course.course_offering_id,
            enrollment_date: new Date(),
            status: 'enrolled',
          })),
        });
      }

      // Step F: Fetch the complete student record to return.
      const completeStudent = await tx.student.findUnique({
        where: { student_id: studentId },
        include: {
          user: true, // Also include the user details in the final output if needed
          details: true,
          admissions: { include: { class: true } },
          enrollments: { include: { courseOffering: { include: { subject: true, teacher: true } } } },
          family_details: true,
          previous_academic_details: true,
          payment_details: true,
          hostel_details: true,
          facilities: true,
          addresses: true,
          documents: true,
        },
      });

      return { completeStudent, password: randomPassword };
    });

    // --- 3. Success Response ---
    res.status(201).json({
      message: "Student and user account created successfully.",
      data: completeStudent,
      generatedPassword: password 
    });

  } catch (error) {
    // --- 4. Error Handling ---
    if (error.code === 'P2002') { 
      res.status(409); 
      const field = error.meta.target.join(', ');
      if (field === 'username') {
          throw new Error('This username is already taken. The system tried to generate a unique username but failed. Please try a slightly different name.');
      }
      throw new Error(`A record with this unique value already exists. Field: ${field}`);
    }
    
    console.error("Failed to create student:", error);
    res.status(500);
    throw new Error(error.message || 'An unexpected error occurred while creating the student.');
  }
});

module.exports = {
  createStudent
};