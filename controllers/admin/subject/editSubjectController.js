const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');
const prisma = new PrismaClient();

/**
 * @desc    Update a subject's details including its course offerings.
 * @route   PUT /api/admin/subjects/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example req.body
 * {
 * "name": "Advanced Physics",
 * "standard": "12",
 * "sections": ["A", "B"], // Was ["A", "B", "C"] before
 * "teacherId": "t1a2b3c4-d5e6-f789-0123-456789abcdef",
 * "isMandatory": true
 * }
 *
 * @example res.body (Error 409 - Business Logic Conflict)
 * {
 * "message": "Cannot remove subject from one or more sections as 25 student(s) are enrolled. Please withdraw them before changing the sections."
 * }
 */
const editSubject = asyncHandler(async (req, res) => {
  const { id: subjectId } = req.params;
  const { name, standard, sections, teacherId, isMandatory } = req.body;
  const subject_name = name;

  // 1. Basic Input Validation
  if (!subject_name || subject_name.trim() === '') {
    res.status(400);
    throw new Error('Subject name is required and cannot be empty.');
  }
  if (!standard) {
    res.status(400);
    throw new Error('Standard is required.');
  }
  if (!Array.isArray(sections) || sections.length === 0) {
    res.status(400);
    throw new Error('At least one section must be selected.');
  }
  if (!teacherId) {
    res.status(400);
    throw new Error('A subject teacher must be assigned.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 2. Verify Subject, Teacher, and Active Year
    const [subjectToUpdate, teacherExists, activeAcademicYear] = await Promise.all([
      tx.subject.findUnique({ where: { subject_id: subjectId } }),
      tx.employee.findUnique({ where: { employee_id: teacherId } }),
      tx.academicYear.findFirst({ where: { is_active: true } })
    ]);

    if (!subjectToUpdate) {
      res.status(404);
      throw new Error('Subject not found.');
    }
    if (!teacherExists) {
      res.status(404);
      throw new Error('The selected teacher does not exist.');
    }
    if (!activeAcademicYear) {
      res.status(500); // Server configuration error
      throw new Error('No active academic year found. Cannot update subject offerings.');
    }

    // 3. Check for name conflicts if it was changed
    if (subject_name.trim() !== subjectToUpdate.subject_name) {
      const conflictingSubject = await tx.subject.findFirst({
        where: {
          subject_name: subject_name.trim(),
          subject_id: { not: subjectId },
        },
      });
      if (conflictingSubject) {
        res.status(409);
        throw new Error(`A subject with the name "${subject_name}" already exists.`);
      }
    }

    // 4. Update the Subject model itself
    const updatedSubject = await tx.subject.update({
      where: { subject_id: subjectId },
      data: { subject_name: subject_name.trim() },
    });

    // 5. Safely synchronize CourseOfferings
    // This logic determines what to create, update, or delete without losing enrollment data.

    // a. Get the desired state (target classes)
    const targetClasses = await tx.class.findMany({
        where: {
            standard: standard,
            section: { in: sections },
            academic_year_id: activeAcademicYear.academic_year_id,
        },
        select: { class_id: true }
    });
    if(targetClasses.length !== sections.length) {
       res.status(404);
       throw new Error('One or more of the specified classes could not be found for the active academic year.');
    }
    const targetClassIds = targetClasses.map(c => c.class_id);

    // b. Get the current state (existing offerings)
    const existingOfferings = await tx.courseOffering.findMany({
        where: { subject_id: subjectId }
    });
    const existingClassIds = existingOfferings.map(o => o.class_id);
    
    // c. Calculate which offerings to remove (exist in DB but not in new request)
    const offeringsToDelete = existingOfferings.filter(o => !targetClassIds.includes(o.class_id));

    if (offeringsToDelete.length > 0) {
      const offeringIdsToDelete = offeringsToDelete.map(o => o.course_offering_id);
      
      // ★★★ BUSINESS LOGIC CHECK ★★★
      // Before deleting an offering, check if it has student enrollments.
      const enrollmentsCount = await tx.studentCourseEnrollment.count({
        where: { course_offering_id: { in: offeringIdsToDelete } }
      });

      if (enrollmentsCount > 0) {
        res.status(409); // 409 Conflict is appropriate for business rule violations
        throw new Error(`Cannot remove subject from one or more sections as ${enrollmentsCount} student(s) are enrolled. Please withdraw them before changing the sections.`);
      }

      // If check passes, proceed with deletion
      await tx.courseOffering.deleteMany({
        where: { course_offering_id: { in: offeringIdsToDelete } }
      });
    }

    // d. Calculate which offerings to update (exist in both DB and new request)
    const classIdsToUpdate = existingClassIds.filter(id => targetClassIds.includes(id));
    if (classIdsToUpdate.length > 0) {
      await tx.courseOffering.updateMany({
        where: {
          subject_id: subjectId,
          class_id: { in: classIdsToUpdate }
        },
        data: {
          teacher_id: teacherId,
          is_mandatory: isMandatory
        }
      });
    }

    // e. Calculate which offerings to create (exist in new request but not in DB)
    const classIdsToCreate = targetClassIds.filter(id => !existingClassIds.includes(id));
    if (classIdsToCreate.length > 0) {
      await tx.courseOffering.createMany({
        data: classIdsToCreate.map(classId => ({
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
          is_mandatory: isMandatory,
        })),
      });
    }

    // 6. Return the consolidated result
    return {
      ...updatedSubject,
      standard,
      sections,
      teacherId,
      isMandatory
    };
  });

  res.status(200).json(result);
});

module.exports = { editSubject };