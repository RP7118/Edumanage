const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');
const prisma = new PrismaClient();

/**
 * @desc    Fetch student credentials by class.
 * @route   GET /admin/student/credentials
 * @access  Private/Admin
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example
 * // Fetch credentials for students in standard 10, section A
 * GET /admin/student/credentials?standard=10&section=A
 */
const getStudentCredentials = asyncHandler(async (req, res) => {
  const { standard, section } = req.query;

  // 1. Validate query parameters
  if (!standard || !section) {
    res.status(400);
    throw new Error('Standard and section query parameters are required.');
  }

  // 2. Find the active academic year
  const activeAcademicYear = await prisma.academicYear.findFirst({
    where: { is_active: true },
  });

  if (!activeAcademicYear) {
    res.status(404);
    throw new Error('No active academic year found.');
  }

  // 3. Find the class based on standard, section, and active academic year
  const targetClass = await prisma.class.findFirst({
    where: {
      standard: {
        equals: standard,
        mode: 'insensitive',
      },
      section: {
        equals: section,
        mode: 'insensitive',
      },
      academic_year_id: activeAcademicYear.academic_year_id,
    },
  });

  if (!targetClass) {
    res.status(404);
    throw new Error(
      `Class not found for Standard: ${standard}, Section: ${section} in the current academic year.`
    );
  }

  // 4. Fetch admissions for the class, including student and user data
  const admissions = await prisma.admission.findMany({
    where: {
      class_id: targetClass.class_id,
    },
    select: {
      roll_number: true,
      student: {
        select: {
          student_id: true,
          first_name: true,
          last_name: true,
          user: {
            select: {
              username: true,
              password: true, // WARNING: Sending plaintext passwords is a major security risk.
            },
          },
        },
      },
    },
    orderBy: {
      student: {
        first_name: 'asc',
      },
    },
  });

  if (!admissions || admissions.length === 0) {
    res.status(404);
    throw new Error('No students found for the specified class.');
  }

  // 5. Map the data to the desired response format
  const studentCredentials = admissions.map((admission) => ({
    id: admission.student.student_id,
    fullName: `${admission.student.first_name} ${admission.student.last_name}`,
    rollNumber: admission.roll_number || null,
    username: admission.student.user?.username || null,
    password: admission.student.user?.password || null, // WARNING: Exposing plaintext passwords.
  }));

  res.status(200).json({
    message: 'Student credentials retrieved successfully.',
    count: studentCredentials.length,
    data: studentCredentials,
  });
});

/**
 * Generates a simple, predictable password for a student.
 * @param {string} firstName - The student's first name.
 * @returns {string} A generated password (e.g., "john1234").
 */
const generatePassword = (firstName) => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${firstName.toLowerCase().replace(/\s/g, '')}${randomSuffix}`;
};


/**
 * @desc    Create or reset credentials for one or more students.
 * @route   POST /admin/student/set-credentials
 * @access  Private/Admin
 *
 * @param {object} req - Express request object with body.
 * @param {object} res - Express response object.
 *
 * @example
 * // Body for the request
 * {
 * "studentIds": ["uuid-for-student-1", "uuid-for-student-2"]
 * }
 */
const setStudentCredentials = asyncHandler(async (req, res) => {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400);
        throw new Error('studentIds must be a non-empty array.');
    }

    const results = {
        success: [],
        failed: [],
    };

    for (const studentId of studentIds) {
        try {
            const student = await prisma.student.findUnique({
                where: { student_id: studentId },
                include: {
                    user: true,
                    admissions: {
                        orderBy: { admission_date: 'desc' },
                        take: 1, // Get the most recent admission record
                    },
                },
            });

            if (!student) {
                results.failed.push({ studentId, reason: 'Student not found.' });
                continue;
            }

            const newPassword = generatePassword(student.first_name);

            if (student.user) {
                // --- User exists, just update the password ---
                const updatedUser = await prisma.user.update({
                    where: { user_id: student.user.user_id },
                    data: { password: newPassword }, // Note: Password should be hashed in a real application
                });
                results.success.push({
                    studentId,
                    username: updatedUser.username,
                    password: newPassword, // For immediate display if needed
                });

            } else {
                // --- User does not exist, create a new one ---
                if (!student.admissions || student.admissions.length === 0 || !student.admissions[0].gr_number) {
                    results.failed.push({ studentId, reason: 'Student has no GR number to use as a username.' });
                    continue;
                }
                
                const username = student.admissions[0].gr_number;

                // Use a transaction to ensure both creation and linking succeed or fail together
                const newUser = await prisma.$transaction(async (tx) => {
                    const createdUser = await tx.user.create({
                        data: {
                            username: username,
                            password: newPassword, // Note: Should be hashed
                            role: 'student',
                        },
                    });

                    await tx.student.update({
                        where: { student_id: studentId },
                        data: { user_id: createdUser.user_id },
                    });
                    
                    return createdUser;
                });
                
                results.success.push({
                    studentId,
                    username: newUser.username,
                    password: newPassword,
                });
            }
        } catch (error) {
            results.failed.push({
                studentId,
                reason: error.message || 'An unexpected error occurred.',
            });
        }
    }

    res.status(200).json({
        message: `Credential processing complete. ${results.success.length} succeeded, ${results.failed.length} failed.`,
        ...results,
    });
});


module.exports = {
  getStudentCredentials,
  setStudentCredentials,
};
