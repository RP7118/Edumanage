/**
 * controllers/admin/subject/enrollStudentsController.js
 *
 * This controller handles enrolling one or more students into a specific subject.
 *
 * It works by:
 * 1. Validating the incoming subjectId and the array of studentIds.
 * 2. Using a transaction to ensure all enrollments succeed or none do.
 * 3. Finding all course offerings associated with the subject.
 * 4. For each student, identifying their specific class (e.g., 10-A).
 * 5. Matching the student's class to the correct course offering.
 * 6. Checking for existing enrollments to prevent duplicates.
 * 7. Creating new StudentCourseEnrollment records for all valid, non-enrolled students.
 */

const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Enroll students in a subject
 * @route   POST /api/admin/subjects/:subjectId/students
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example req.params
 * { "subjectId": "uuid-for-the-subject" }
 *
 * @example req.body
 * { "studentIds": ["uuid-for-student-1", "uuid-for-student-2"] }
 */
const enrollStudents = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { studentIds } = req.body;

    // 1. Validate input
    if (!subjectId) {
        res.status(400);
        throw new Error('Subject ID is required in the URL parameters.');
    }
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400);
        throw new Error('An array of studentIds is required in the request body.');
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 2. Find all course offerings for this subject
            const courseOfferings = await tx.courseOffering.findMany({
                where: { subject_id: subjectId },
                select: { course_offering_id: true, class_id: true },
            });

            if (courseOfferings.length === 0) {
                res.status(404);
                throw new Error('This subject is not linked to any classes yet. No students can be enrolled.');
            }

            // Create a map for quick lookup: class_id -> course_offering_id
            const classToCourseOfferingMap = new Map(
                courseOfferings.map(co => [co.class_id, co.course_offering_id])
            );
            const courseOfferingIds = courseOfferings.map(co => co.course_offering_id);

            // 3. Get the class for each student from their latest admission record
            const studentAdmissions = await tx.admission.findMany({
                where: { student_id: { in: studentIds } },
                select: { student_id: true, class_id: true },
                // You might add an orderBy here if students can have multiple admission records
                // orderBy: { admission_date: 'desc' }
            });

            // 4. Check for students who are already enrolled in this subject's courses
            const existingEnrollments = await tx.studentCourseEnrollment.findMany({
                where: {
                    student_id: { in: studentIds },
                    course_offering_id: { in: courseOfferingIds },
                },
                select: { student_id: true, course_offering_id: true },
            });

            const existingEnrollmentSet = new Set(
                existingEnrollments.map(e => `${e.student_id}-${e.course_offering_id}`)
            );

            // 5. Prepare the data for new enrollments
            const enrollmentsToCreate = [];
            for (const admission of studentAdmissions) {
                const courseOfferingId = classToCourseOfferingMap.get(admission.class_id);

                if (courseOfferingId) {
                    const enrollmentKey = `${admission.student_id}-${courseOfferingId}`;
                    // Only add if the student is not already enrolled
                    if (!existingEnrollmentSet.has(enrollmentKey)) {
                        enrollmentsToCreate.push({
                            student_id: admission.student_id,
                            course_offering_id: courseOfferingId,
                        });
                    }
                }
            }

            // 6. Create the new enrollment records if there are any
            if (enrollmentsToCreate.length > 0) {
                await tx.studentCourseEnrollment.createMany({
                    data: enrollmentsToCreate,
                });
            }

            return {
                enrolledCount: enrollmentsToCreate.length,
                alreadyEnrolledCount: studentIds.length - enrollmentsToCreate.length,
            };
        });

        res.status(201).json({
            message: `Successfully enrolled ${result.enrolledCount} new students. ${result.alreadyEnrolledCount} students were already enrolled.`,
            data: result,
        });

    } catch (error) {
        res.status(error.statusCode || 500);
        throw new Error(error.message || 'An unexpected error occurred while enrolling students.');
    }
});

module.exports = { enrollStudents };

