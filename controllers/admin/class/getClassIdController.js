const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Get a single class by its ID with detailed information
 * @route   GET /api/admin/classes/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. The class ID should be in the URL parameters.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with a single detailed class object or a 404 error.
 *
 * @example req.params
 * {
 *   "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example res.json
 * {
 *   "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 *   "name": "Class 10-A",
 *   "standard": "10",
 *   "section": "A",
 *   "medium": "English",
 *   "capacity": 40,
 *   "teacher": {
 *     "id": "t1e2a3c4-h5e6-r789-0123-456789abcdef",
 *     "name": "Jane Doe",
 *     "avatar": "https://example.com/avatars/jane_doe.png",
 *     "email": "jane.doe@example.com",
 *     "phone": "123-456-7890"
 *   },
 *   "students": [
 *     {
 *       "id": "s1t2u3d4-e5n6-t789-0123-456789abcdef",
 *       "name": "John Smith",
 *       "avatar": "https://example.com/avatars/john_smith.png",
 *       "regNo": "ADM-00123",
 *       "rollNo": "1",
 *       "gender": "male",
 *       "parentName": "Robert Smith",
 *       "contact": "987-654-3210",
 *       "status": "active"
 *     }
 *   ],
 *   "subjects": [
 *     {
 *       "id": "sub1-ject-2345-6789-0abcdef12345",
 *       "name": "Mathematics",
 *       "teacher": {
 *         "id": "t1e2a3c4-h5e6-r789-0123-456789abcdef",
 *         "name": "Jane Doe",
 *         "avatar": "https://example.com/avatars/jane_doe.png"
 *       },
 *       "materialsAvailable": true,
 *       "quizAvailable": false
 *     }
 *   ]
 * }
 */
const getClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classData = await prisma.class.findUnique({
    where: {
      class_id: id,
    },
    include: {
      // 1. Get Class Teacher details
      classTeacher: {
        select: {
          employee_id: true,
          full_name: true,
          profile_avatar_url: true,
          email: true,
          phone_number: true,
        },
      },
      // 2. Get all admissions to find enrolled students
      admissions: {
        select: {
          admission_number: true,
          roll_number: true,
          student: {
            select: {
              student_id: true,
              first_name: true,
              last_name: true,
              profile_avatar_url: true,
              gender: true,
              status: true,
              family_details: {
                select: {
                  father_name: true,
                  father_contact_number: true,
                },
              },
            },
          },
        },
      },
      // 3. Get all course offerings to find assigned subjects
      courseOfferings: {
        select: {
          subject: {
            select: {
              subject_id: true,
              subject_name: true,
            },
          },
          teacher: {
            select: {
              employee_id: true,
              full_name: true,
              profile_avatar_url: true,
            },
          },
          _count: {
            select: {
              materials: true,
            },
          },
        },
      },
    },
  });

  if (!classData) {
    res.status(404);
    throw new Error('Class not found');
  }

  // Format the data to match the frontend component's expectations
  const formattedClass = {
    id: classData.class_id,
    name: classData.class_name,
    standard: classData.standard,
    section: classData.section,
    medium: classData.medium,
    capacity: classData.capacity,
    teacher: classData.classTeacher
      ? {
          id: classData.classTeacher.employee_id,
          name: classData.classTeacher.full_name,
          avatar: classData.classTeacher.profile_avatar_url,
          email: classData.classTeacher.email,
          phone: classData.classTeacher.phone_number,
        }
      : null,
    students: classData.admissions.map((admission) => ({
      id: admission.student.student_id,
      name: `${admission.student.first_name} ${admission.student.last_name}`,
      avatar: admission.student.profile_avatar_url,
      regNo: admission.admission_number,
      rollNo: admission.roll_number,
      gender: admission.student.gender,
      parentName: admission.student.family_details?.father_name || 'N/A',
      contact: admission.student.family_details?.father_contact_number || 'N/A',
      status: admission.student.status,
    })),
    subjects: classData.courseOfferings.map((offering) => ({
      id: offering.subject.subject_id,
      name: offering.subject.subject_name,
      teacher: offering.teacher
        ? {
            id: offering.teacher.employee_id,
            name: offering.teacher.full_name,
            avatar: offering.teacher.profile_avatar_url,
          }
        : null,
      materialsAvailable: offering._count.materials > 0,
      quizAvailable: false, // Placeholder as 'quiz' is not in the schema
    })),
  };

  res.status(200).json(formattedClass);
});

module.exports = {
  getClassById,
};