/**
 * controllers/admin/subject/getAllSubjectsController.js
 *
 * This controller fetches a comprehensive list of all subjects along with their related details.
 *
 * For each subject, it aggregates data from its course offerings to provide:
 * - A unique list of sections (e.g., ['A', 'B', 'C']).
 * - The primary standard it's taught in.
 * - Details of the assigned teacher.
 * - A total count of enrolled students.
 * - A list of associated course materials.
 */

const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Get a list of all subjects with aggregated details
 * @route   GET /api/v1/subject/
 * @access  Private (Admin)
 */
const getAllSubjects = asyncHandler(async (req, res) => {
    // 1. Fetch subjects and include all related course offering data.
    const subjectsWithDetails = await prisma.subject.findMany({
        include: {
            courseOfferings: {
                select: {
                    is_mandatory: true,
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
                    _count: {
                        select: { enrollments: true },
                    },
                },
            },
        },
        orderBy: {
            created_at: 'desc', // Show newly created subjects first
        },
    });

    // 2. Transform the deeply nested data from Prisma into a clean, flat format for the frontend.
    const formattedSubjects = subjectsWithDetails.map(subject => {
        if (subject.courseOfferings.length === 0) {
            // Handle subjects that might not be linked to any class yet
            return {
                id: subject.subject_id,
                name: subject.subject_name,
                code: subject.subject_code,
                standard: 'N/A',
                sections: [],
                teacher: null,
                materials: [],
                studentCount: 0,
                isMandatory: true, // Default value
            };
        }

        // Use a Set to collect unique sections
        const sections = [...new Set(subject.courseOfferings.map(co => co.class.section))];

        // Sum the student counts from all course offerings
        const studentCount = subject.courseOfferings.reduce((acc, co) => acc + co._count.enrollments, 0);

        // Aggregate all materials from all offerings into one list
        const materials = subject.courseOfferings.flatMap(co =>
            co.materials.map(m => ({
                id: m.material_id,
                fileName: m.material_name,
                file: m.file_url, // 'file' matches the frontend prop name
            }))
        );

        // Take standard, teacher, and mandatory status from the first course offering as a representative value
        const representativeOffering = subject.courseOfferings[0];

        return {
            id: subject.subject_id,
            name: subject.subject_name,
            code: subject.subject_code,
            standard: representativeOffering.class.standard,
            sections: sections,
            teacherId: representativeOffering.teacher?.employee_id,
            teacher: representativeOffering.teacher ? {
                id: representativeOffering.teacher.employee_id,
                name: representativeOffering.teacher.full_name,
                avatar: representativeOffering.teacher.profile_avatar_url,
            } : null,
            materials: materials,
            // studentIds is used on the frontend, here we provide the count
            studentIds: { length: studentCount }, // Mimicking the frontend's usage
            isMandatory: representativeOffering.is_mandatory,
        };
    });

    res.status(200).json({
        message: `Found ${formattedSubjects.length} subjects.`,
        data: formattedSubjects,
    });
});

module.exports = { getAllSubjects };

