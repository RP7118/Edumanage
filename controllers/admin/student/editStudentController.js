const asyncHandler = require('express-async-handler');
// Adjust the path to your Prisma Client based on your project's directory structure
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Update a student's profile information across all related tables.
 * @route   PUT /api/students/:id
 * @access  Private (e.g., Admin, or authorized user)
 * @body    A comprehensive object containing all student data fields from the frontend form.
 */
const editStudent = asyncHandler(async (req, res) => {
    const { id: studentId } = req.params;
    const data = req.body;

    // First, verify that the student exists before attempting an update.
    const studentExists = await prisma.student.findUnique({
        where: { student_id: studentId },
    });

    if (!studentExists) {
        res.status(404);
        throw new Error('Student not found.');
    }

    // Use a Prisma transaction to ensure that all updates across multiple tables
    // are atomic. If any single update fails, the entire operation will be rolled back.
    const updatedStudent = await prisma.$transaction(async (tx) => {
        
        // 1. Update the core 'Student' table
        const studentUpdate = await tx.student.update({
            where: { student_id: studentId },
            data: {
                first_name: data.firstName,
                last_name: data.lastName,
                dob: data.dob ? new Date(data.dob) : undefined,
                gender: data.gender,
                status: data.status,
                profile_avatar_url: data.avatar,
            },
        });

        // 2. Update the 'Admission' record associated with the student.
        // Assumes a student has one primary admission record to update.
        if (data.admissionNumber) {
            await tx.admission.updateMany({
                where: { student_id: studentId },
                data: {
                    roll_number: data.rollNo,
                    admission_date: data.admissionDate ? new Date(data.admissionDate) : undefined,
                    form_number: data.formNumber,
                    gr_number: data.grNumber,
                },
            });
        }
        
        // 3. Use 'upsert' for all one-to-one related tables.
        // 'upsert' will UPDATE the record if it exists, or CREATE it if it doesn't.
        // This makes the controller robust for students who may not have all details filled out initially.

        // Update StudentDetails
        await tx.studentDetails.upsert({
            where: { student_id: studentId },
            update: {
                middle_name: data.middleName,
                birth_place: data.birthPlace,
                religion: data.religion,
                caste: data.caste,
                reservation_category: data.reservationCategory,
                blood_group: data.bloodGroup,
                aadhar_number: data.aadharNumber,
                uid_number: data.uidNumber,
                apaar_id: data.apaarId,
                pen_number: data.penNumber,
            },
            create: {
                student_id: studentId,
                middle_name: data.middleName,
                birth_place: data.birthPlace,
                religion: data.religion,
                caste: data.caste,
                reservation_category: data.reservationCategory,
                blood_group: data.bloodGroup,
                aadhar_number: data.aadharNumber,
                uid_number: data.uidNumber,
                apaar_id: data.apaarId,
                pen_number: data.penNumber,
            }
        });

        // Update StudentFamilyDetails
        await tx.studentFamilyDetails.upsert({
            where: { student_id: studentId },
            update: {
                father_name: data.fatherName,
                father_occupation: data.fatherOccupation,
                father_contact_number: data.fatherContact,
                father_annual_income: data.fatherIncome ? parseFloat(data.fatherIncome) : undefined,
                mother_name: data.motherName,
                mother_occupation: data.motherOccupation,
                mother_contact_number: data.motherContact,
                mother_annual_income: data.motherIncome ? parseFloat(data.motherIncome) : undefined,
                guardian_name: data.guardianName,
                guardian_occupation: data.guardianOccupation,
                guardian_contact_number: data.guardianContact,
                guardian_address: data.guardianAddress,
            },
            create: {
                student_id: studentId,
                father_name: data.fatherName,
                mother_name: data.motherName,
                // Include other relevant fields for creation
            }
        });

        // Update StudentPreviousAcademicDetails
        await tx.studentPreviousAcademicDetails.upsert({
            where: { student_id: studentId },
            update: {
                previous_school_name: data.previousSchoolName,
                previous_school_address: data.previousSchoolAddress,
                previous_school_standard: data.previousSchoolStandard,
                school_udise_code: data.schoolUdiseCode,
                board_seat_number: data.boardSeatNumber,
                board_sid_number: data.boardSidNumber,
            },
            create: { student_id: studentId }
        });
        
        // Update StudentPaymentDetails
        await tx.studentPaymentDetails.upsert({
             where: { student_id: studentId },
             update: {
                account_holder_name: data.accountHolderName,
                bank_name: data.bankName,
                ifsc_code: data.ifscCode,
                account_number: data.accountNumber,
                bank_branch: data.bankBranch,
                has_scholarship: data.scholarship,
                scholarship_amount: data.scholarshipAmount ? parseFloat(data.scholarshipAmount) : undefined,
             },
             create: { student_id: studentId }
        });

        // Update StudentHostelDetails
        await tx.studentHostelDetails.upsert({
            where: { student_id: studentId },
            update: {
                hostel_name: data.hostelName,
                warden_name: data.wardenName,
                warden_contact: data.wardenContact,
                hostel_contact: data.hostelContact,
                hostel_address: data.hostelAddress,
            },
            create: { student_id: studentId }
        });
        
        // Update StudentFacilities
        if (data.facilities) {
            await tx.studentFacilities.upsert({
                where: { student_id: studentId },
                update: data.facilities, // e.g., { cafeteria: true, transportation: false, hostel: true }
                create: { student_id: studentId, ...data.facilities }
            });
        }
        
        // Update StudentAddress (assumes one primary address record)
        const studentAddress = await tx.studentAddress.findFirst({ where: { student_id: studentId }});
        if (studentAddress) {
            await tx.studentAddress.update({
                where: { address_id: studentAddress.address_id },
                data: {
                    address_line: data.address,
                    taluka: data.taluka,
                    district: data.district,
                    primary_contact: data.mobileNumber1,
                    secondary_contact: data.mobileNumber2,
                }
            });
        }

        // Return the main student record from the transaction
        return studentUpdate;
    });

    res.status(200).json({
        message: 'Student profile updated successfully.',
        data: updatedStudent,
    });
});

module.exports = { editStudent };