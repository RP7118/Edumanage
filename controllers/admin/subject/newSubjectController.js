// Import necessary packages
const asyncHandler = require('express-async-handler');
// The Prisma client is imported from the generated directory.
// The path '../../..' assumes that the `controllers` directory is at the root level.
// Please adjust this path based on your actual project structure.
const { PrismaClient } = require('../../../generated/prisma');

// Initialize Prisma Client
const prisma = new PrismaClient();

/**
 * @desc    Create a new subject and its course offerings
 * @route   POST /api/admin/subjects
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. The body should contain the subject data.
 * @param {object} res - Express response object.
 *
 * @example req.body
 * {
 * "name": "Advanced Mathematics",
 * "standard": "12",
 * "sections": ["A", "B"],
 * "teacherId": "uuid-for-teacher-goes-here",
 * "isMandatory": true
 * }
 */
const createSubject = asyncHandler(async (req, res) => {
    // 1. Destructure and validate the request body
    const { name, standard, sections, teacherId, isMandatory } = req.body;

    if (!name || !standard || !sections || !Array.isArray(sections) || sections.length === 0 || !teacherId) {
        res.status(400); // Bad Request
        throw new Error('Please provide all required fields: name, standard, sections (as an array), and teacherId.');
    }

    try {
        // 2. Use a transaction to ensure that either all database operations succeed or none do.
        const result = await prisma.$transaction(async (tx) => {
            // 3. Check if a subject with the same name already exists.
            const existingSubjectByName = await tx.subject.findUnique({
                where: {
                    subject_name: name,
                },
            });

            if (existingSubjectByName) {
                const error = new Error('A subject with this name already exists.');
                error.statusCode = 409; // Conflict
                throw error;
            }

            // 4. Generate a unique subject code.
            let subjectCode;
            const nameParts = name.trim().split(/\s+/);
            let baseCode;

            if (nameParts.length > 1) {
                // Take the first letter of each word for multi-word names.
                baseCode = nameParts.map(part => part[0]).join('').toUpperCase();
            } else {
                // Take the first three letters for single-word names.
                baseCode = name.substring(0, 3).toUpperCase();
            }

            // Combine base code with the standard.
            let finalBaseCode = `${baseCode}-${standard}`;
            let counter = 0;
            let isUnique = false;

            // Loop to find a unique code by appending a counter if necessary.
            while (!isUnique) {
                subjectCode = counter === 0 ? finalBaseCode : `${finalBaseCode}-${counter}`;
                const existingSubjectByCode = await tx.subject.findUnique({
                    where: { subject_code: subjectCode },
                });

                if (!existingSubjectByCode) {
                    isUnique = true;
                } else {
                    counter++;
                }
            }

            // 5. Create the new subject record in the database with the unique code.
            const newSubject = await tx.subject.create({
                data: {
                    subject_name: name,
                    subject_code: subjectCode,
                },
            });

            // 6. Find all class records that match the specified standard and sections.
            const targetClasses = await tx.class.findMany({
                where: {
                    standard: standard,
                    section: {
                        in: sections,
                    },
                },
                select: {
                    class_id: true,
                },
            });

            if (targetClasses.length === 0) {
                const error = new Error(`No classes found for standard '${standard}' with sections [${sections.join(', ')}].`);
                error.statusCode = 404; // Not Found
                throw error;
            }

            // 7. Prepare the data for creating multiple course offerings.
            const courseOfferingsData = targetClasses.map(cls => ({
                class_id: cls.class_id,
                subject_id: newSubject.subject_id,
                teacher_id: teacherId,
                is_mandatory: isMandatory === true, // Ensure value is a boolean
            }));

            // 8. Create the course offerings that link the subject to the classes.
            await tx.courseOffering.createMany({
                data: courseOfferingsData,
            });

            // --- Automatic Student Enrollment for Mandatory Subjects ---
            if (isMandatory === true) {
                // 9. Get the newly created course offerings to enroll students
                const newCourseOfferings = await tx.courseOffering.findMany({
                    where: {
                        subject_id: newSubject.subject_id,
                        class_id: { in: targetClasses.map(c => c.class_id) },
                    },
                    select: { course_offering_id: true, class_id: true },
                });

                if (newCourseOfferings.length > 0) {
                    // 10. Find all students in the target classes
                    const studentsToEnroll = await tx.admission.findMany({
                        where: {
                            class_id: { in: targetClasses.map(c => c.class_id) },
                        },
                        select: { student_id: true, class_id: true },
                    });

                    if (studentsToEnroll.length > 0) {
                        const classToCourseOfferingMap = new Map(
                            newCourseOfferings.map(co => [co.class_id, co.course_offering_id])
                        );

                        const enrollmentsToCreate = studentsToEnroll.map(admission => {
                            const courseOfferingId = classToCourseOfferingMap.get(admission.class_id);
                            if (courseOfferingId) {
                                return {
                                    student_id: admission.student_id,
                                    course_offering_id: courseOfferingId,
                                };
                            }
                        }).filter(Boolean);

                        // 11. Create the student course enrollments
                        if (enrollmentsToCreate.length > 0) {
                            await tx.studentCourseEnrollment.createMany({
                                data: enrollmentsToCreate,
                            });
                        }
                    }
                }
            }

            // Return the newly created subject from the transaction.
            return newSubject;
        });

        // 9. Send a success response if the transaction completes.
        res.status(201).json({
            message: 'Subject and course offerings created successfully.',
            data: result,
        });

    } catch (error) {
        // If an error is thrown within the transaction, it will be caught here.
        // The transaction will be automatically rolled back by Prisma.
        res.status(error.statusCode || 500);
        // Re-throw the error to be handled by the global error handler middleware.
        throw new Error(error.message || 'An unexpected error occurred while creating the subject.');
    }
});

// Export the controller to be used in the routes
module.exports = { createSubject };
