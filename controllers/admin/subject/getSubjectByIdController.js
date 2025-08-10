const { PrismaClient } = require("../../../generated/prisma");
const asyncHandler = require("express-async-handler");
const prisma = new PrismaClient();

/**
 * @desc    Get a single subject by its ID with detailed information
 * @route   GET /api/admin/subjects/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example req.params
 * { "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef" }
 *
 * @example res.body (Success 200)
 * {
 *   "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 *   "name": "Mathematics",
 *   "standard": "10",
 *   "sections": ["A", "B"],
 *   "materials": [
 *     {
 *       "id": "material-uuid-1",
 *       "fileName": "Chapter 1 - Algebra.pdf",
 *       "file": "https://storage.googleapis.com/bucket/algebra.pdf"
 *     }
 *   ],
 *   "quiz": false,
 *   "teacher": {
 *     "id": "teacher-uuid-1",
 *     "name": "Dr. Evelyn Reed",
 *     "avatar": "https://example.com/avatars/evelyn.jpg",
 *     "email": "e.reed@school.edu",
 *     "phone": "+1-202-555-0178"
 *   },
 *   "enrolledStudents": [
 *     {
 *       "id": "student-uuid-1",
 *       "name": "John Doe",
 *       "avatar": "https://example.com/avatars/john.jpg",
 *       "regNo": "ADM-2024-001",
 *       "rollNo": "101",
 *       "section": "A",
 *       "phone": "+1-202-555-0182",
 *       "email": "N/A",
 *       "status": "active"
 *     }
 *   ]
 * }
 */
const getSubjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("Subject ID is required.");
  }

  // Fetch the subject and all its related data in a single, efficient query.
  const subject = await prisma.subject.findUnique({
    where: {
      subject_id: id,
    },
    include: {
      // A subject can be offered in multiple classes (e.g., Math for 10-A, 10-B).
      // We fetch all offerings to aggregate sections and students.
      courseOfferings: {
        // In a real-world app, you might add a filter here for the active academic year.
        // where: { class: { academicYear: { is_active: true } } },
        include: {
          class: {
            select: {
              standard: true,
              section: true,
            },
          },
          teacher: {
            select: {
              employee_id: true,
              full_name: true,
              email: true,
              phone_number: true,
              profile_avatar_url: true,
            },
          },
          materials: {
            select: {
              material_id: true,
              material_name: true,
              file_url: true,
            },
          },
          enrollments: {
            include: {
              student: {
                include: {
                  // Fetch the most recent admission to get roll number and registration number.
                  admissions: {
                    orderBy: { admission_date: "desc" },
                    take: 1,
                    select: {
                      roll_number: true,
                      admission_number: true, // Corresponds to regNo in the frontend
                    },
                  },
                  // Fetch an address to get a contact number.
                  addresses: {
                    take: 1,
                    select: {
                      primary_contact: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!subject) {
    res.status(404);
    throw new Error("Subject not found");
  }

  // If the subject exists but is not yet offered in any class.
  if (subject.courseOfferings.length === 0) {
    res.status(200).json({
      id: subject.subject_id,
      name: subject.subject_name,
      standard: "N/A",
      sections: [],
      materials: [],
      quiz: false, // Placeholder as per component
      teacher: null,
      enrolledStudents: [],
    });
    return;
  }

  // --- Data Transformation ---
  // The raw data from Prisma is nested. We transform it to match the React component's expected structure.

  const primaryOffering = subject.courseOfferings[0];
  const sections = new Set();
  const allMaterials = [];
  const studentMap = new Map();

  for (const offering of subject.courseOfferings) {
    sections.add(offering.class.section);

    offering.materials.forEach((material) => {
      allMaterials.push({
        id: material.material_id,
        fileName: material.material_name,
        file: material.file_url,
      });
    });

    offering.enrollments.forEach((enrollment) => {
      const student = enrollment.student;
      if (student && !studentMap.has(student.student_id)) {
        studentMap.set(student.student_id, {
          id: student.student_id,
          name: `${student.first_name} ${student.last_name}`,
          avatar: student.profile_avatar_url,
          regNo: student.admissions[0]?.admission_number || "N/A",
          rollNo: student.admissions[0]?.roll_number || "N/A",
          section: offering.class.section,
          phone: student.addresses[0]?.primary_contact || "N/A",
          email: "N/A",
          status: student.status,
        });
      }
    });
  }

  // Construct the final response object.
  const responseData = {
    id: subject.subject_id,
    name: subject.subject_name,
    standard: primaryOffering.class.standard,
    sections: Array.from(sections),
    materials: allMaterials,
    quiz: false,
    teacher: primaryOffering.teacher
      ? {
          id: primaryOffering.teacher.employee_id,
          name: primaryOffering.teacher.full_name,
          avatar: primaryOffering.teacher.profile_avatar_url,
          email: primaryOffering.teacher.email,
          phone: primaryOffering.teacher.phone_number,
        }
      : null,
    enrolledStudents: Array.from(studentMap.values()),
  };

  res.status(200).json(responseData);
});

module.exports = { getSubjectById };
