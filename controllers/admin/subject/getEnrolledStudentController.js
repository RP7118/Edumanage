/**
 * controllers/admin/subject/getEnrolledStudentsController.js
 *
 * This controller fetches a list of all students enrolled in a specific subject.
 *
 * It works by:
 * 1. Validating that the subject exists.
 * 2. Finding all students who have an enrollment record (`StudentCourseEnrollment`)
 * that is linked to a `CourseOffering` which, in turn, is linked to the given `subjectId`.
 * 3. Returning a curated list of student details.
 */

const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Get all students enrolled in a specific subject
 * @route   GET /api/admin/subjects/:subjectId/students
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. It contains route parameters.
 * @param {object} res - Express response object.
 *
 * @example req.params
 * {
 * "subjectId": "uuid-for-the-subject"
 * }
 */
const getEnrolledStudents = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;

    if (!subjectId) {
        res.status(400);
        throw new Error('Subject ID is required.');
    }

    // 1. First, check if the subject actually exists to provide a clear error message.
    const subject = await prisma.subject.findUnique({
        where: {
            subject_id: subjectId,
        },
    });

    if (!subject) {
        res.status(404);
        throw new Error('Subject not found.');
    }

    // 2. Find all students who are enrolled in any course offering for the given subject.
    // This is an efficient way to query through nested relations in Prisma.
    const enrolledStudents = await prisma.student.findMany({
        where: {
            // Find students who have 'some' enrollments...
            enrollments: {
                some: {
                    // ...where the enrollment is for a course offering...
                    courseOffering: {
                        // ...that matches the specified subject ID.
                        subject_id: subjectId,
                    },
                },
            },
        },
        // 3. Select only the necessary fields to send back to the client.
        select: {
            student_id: true,
            first_name: true,
            last_name: true,
            profile_avatar_url: true,
            status: true,
            // Include admission details to get roll number if needed
            admissions: {
                select: {
                    roll_number: true,
                    class: {
                        select: {
                            standard: true,
                            section: true,
                        }
                    }
                }
            }
        },
    });

    res.status(200).json({
        message: `Found ${enrolledStudents.length} students for subject ${subject.subject_name}.`,
        data: enrolledStudents,
    });
});

module.exports = { getEnrolledStudents };