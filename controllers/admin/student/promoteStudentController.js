const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Promote students to a new class.
 * @route   POST /admin/student/promote
 * @access  Private (Admin)
 */
const promoteStudents = asyncHandler(async (req, res) => {
  const { studentIds, targetClassId } = req.body;

  // --- Input Validation ---
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400);
    throw new Error('The "studentIds" field must be a non-empty array.');
  }
  if (!targetClassId || typeof targetClassId !== 'string') {
    res.status(400);
    throw new Error('The "targetClassId" field is required and must be a string.');
  }

  // --- Server-side Validation & Logic ---

  // 1. Fetch target class details and current number of students in it.
  const targetClass = await prisma.class.findUnique({
    where: {
      class_id: targetClassId,
    },
    include: {
      // Get a count of related admissions to check capacity
      _count: {
        select: { admissions: true },
      },
    },
  });

  if (!targetClass) {
    res.status(404);
    throw new Error('Target class not found.');
  }

  // 2. Ensure the target class has enough capacity.
  const currentStudentCount = targetClass._count.admissions;
  const incomingStudentCount = studentIds.length;
  const newTotalStudents = currentStudentCount + incomingStudentCount;

  if (newTotalStudents > targetClass.capacity) {
    res.status(400);
    throw new Error(
      `Class capacity exceeded. Capacity is ${targetClass.capacity}, but this action would result in ${newTotalStudents} students.`
    );
  }

  // 3. Get current admissions to identify current classes for subject enrollment management
  const currentAdmissions = await prisma.admission.findMany({
    where: {
      student_id: {
        in: studentIds,
      },
    },
    select: {
      student_id: true,
      class_id: true,
    },
  });

  // 4. Get target class course offerings for new enrollments
  const targetCourseOfferings = await prisma.courseOffering.findMany({
    where: {
      class_id: targetClassId,
    },
    select: {
      course_offering_id: true,
      subject_id: true,
      is_mandatory: true,
    },
  });

  // 5. Perform the update within a transaction for data integrity
  const result = await prisma.$transaction(async (tx) => {
    // Update admissions to new class
    const updatedAdmissions = await tx.admission.updateMany({
      where: {
        student_id: {
          in: studentIds,
        },
      },
      data: {
        class_id: targetClassId,
      },
    });

    // Remove students from current class subject enrollments
    const currentClassIds = [...new Set(currentAdmissions.map(a => a.class_id))];
    if (currentClassIds.length > 0) {
      await tx.studentCourseEnrollment.deleteMany({
        where: {
          student_id: {
            in: studentIds,
          },
          courseOffering: {
            class_id: {
              in: currentClassIds,
            },
          },
        },
      });
    }

    // Enroll students in target class subjects
    if (targetCourseOfferings.length > 0) {
      const enrollmentData = [];
      for (const studentId of studentIds) {
        for (const courseOffering of targetCourseOfferings) {
          enrollmentData.push({
            student_id: studentId,
            course_offering_id: courseOffering.course_offering_id,
            status: 'enrolled',
          });
        }
      }

      if (enrollmentData.length > 0) {
        await tx.studentCourseEnrollment.createMany({
          data: enrollmentData,
          skipDuplicates: true, // In case of any existing enrollments
        });
      }
    }

    return {
      updatedAdmissions,
      enrolledSubjects: targetCourseOfferings.length,
      totalEnrollments: targetCourseOfferings.length * studentIds.length,
    };
  });

  // --- Success Response ---
  res.status(200).json({
    message: `Successfully promoted ${result.updatedAdmissions.count} students to ${targetClass.class_name}.`,
    data: {
        promotedCount: result.updatedAdmissions.count,
        targetClassId: targetClass.class_id,
        targetClassName: targetClass.class_name,
        subjectEnrollments: {
          enrolledSubjects: result.enrolledSubjects,
          totalEnrollments: result.totalEnrollments,
        },
    }
  });
});

module.exports = { promoteStudents };