const asyncHandler = require("express-async-handler");
const { PrismaClient, employee_role_enum, gender_enum } = require("../../../generated/prisma");
const { z } = require("zod"); // Recommended for powerful validation

const prisma = new PrismaClient();

/**
 * @description Edit an employee's details
 * @route PUT /api/admin/employees/:id
 * @access Private/Admin
 *
 * @note This controller expects a `multipart/form-data` request.
 * Use a middleware like `multer` to handle file uploads.
 * Form fields will be in `req.body` and uploaded files in `req.files`.
 * Nested objects like 'salary' should be properly parsed (e.g., sent as JSON strings and parsed, or handled by body-parser).
 */
const editEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let data = req.body;
  const files = req.files; // from multer

  // Since form data sends everything as strings, we need to parse nested objects and numbers.
  // This is a common requirement when sending complex objects via multipart/form-data.
  if (data.salary && typeof data.salary === 'string') {
    try {
      data.salary = JSON.parse(data.salary);
    } catch (e) {
      res.status(400);
      throw new Error("Invalid salary format. It must be a valid JSON object.");
    }
  }

  // --- 1. Validation ---
  const employeeSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "A valid email is required" }),
    phone: z.string().min(1, { message: "Phone number is required" }),
    department: z.string().min(1, { message: "Department is required" }),
    designation: z.string().min(1, { message: "Designation is required" }),
    role: z.nativeEnum(employee_role_enum),
    employmentType: z.string().optional(),
    gender: z.nativeEnum(gender_enum),
    dob: z.string().min(1, { message: "Date of birth is required" }),
    address: z.string().optional(),
    qualification: z.string().optional(),
    experience: z.coerce.number().min(0).optional(),
    joiningDate: z.string().min(1, { message: "Joining date is required" }),
    salary: z.object({
        basic: z.coerce.number().min(0),
        allowances: z.coerce.number().min(0),
        deductions: z.coerce.number().min(0)
      }).optional(),
  });

  const validationResult = employeeSchema.safeParse(data);

  if (!validationResult.success) {
    const errors = {};
    validationResult.error.errors.forEach((err) => {
      errors[err.path[0]] = err.message;
    });
    return res.status(400).json({ message: "Please fill in all required fields correctly.", errors });
  }

  const validatedData = validationResult.data;

  // --- 2. Check if the employee exists ---
  const employeeExists = await prisma.employee.findUnique({
    where: { employee_id: id },
  });

  if (!employeeExists) {
    res.status(404);
    throw new Error("Employee not found");
  }

  // --- 3. Perform Update within a Transaction ---
  try {
    const updatedEmployee = await prisma.$transaction(async (tx) => {
      // 3a. Handle Department: Find or create the department to get its ID
      const departmentRecord = await tx.department.upsert({
        where: { department_name: validatedData.department.trim() },
        update: {},
        create: { department_name: validatedData.department.trim() },
      });

      // 3b. Prepare the main employee data for update
      const employeeUpdateData = {
        full_name: validatedData.name,
        email: validatedData.email,
        phone_number: validatedData.phone,
        gender: validatedData.gender,
        dob: new Date(validatedData.dob),
        address: validatedData.address,
        designation: validatedData.designation, // The new field
        highest_qualification: validatedData.qualification,
        years_of_experience: validatedData.experience,
        joining_date: new Date(validatedData.joiningDate),
        role: validatedData.role,
        employment_type: validatedData.employmentType,
        department_id: departmentRecord.department_id,
      };

      // 3c. Update the Employee record
      const employee = await tx.employee.update({
        where: { employee_id: id },
        data: employeeUpdateData,
      });

      // 3d. Handle Salary: Update the latest salary record or create a new one
      if (validatedData.salary) {
        const latestSalary = await tx.employeeSalary.findFirst({
          where: { employee_id: id },
          orderBy: { effective_from_date: "desc" },
        });

        const salaryPayload = {
          basic_salary: validatedData.salary.basic,
          allowances: validatedData.salary.allowances,
          deductions: validatedData.salary.deductions,
        };

        if (latestSalary) {
          await tx.employeeSalary.update({
            where: { salary_id: latestSalary.salary_id },
            data: salaryPayload,
          });
        } else {
          await tx.employeeSalary.create({
            data: {
              ...salaryPayload,
              employee_id: id,
              effective_from_date: new Date(), // Sets effective date to today
            },
          });
        }
      }

      // 3e. Handle new Document Uploads
      if (files && files.length > 0) {
        const documentsToCreate = files.map((file) => ({
          employee_id: id,
          document_name: file.originalname,
          document_type: file.mimetype,
          file_url: `/uploads/employee-documents/${file.filename}`, // Placeholder URL
          is_verified: false,
        }));

        await tx.employeeDocument.createMany({
          data: documentsToCreate,
        });
      }

      return employee;
    });

    res.status(200).json({
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    // --- 4. Handle Specific Prisma Errors ---
    if (error.code === 'P2002') { // Prisma unique constraint violation
      const field = error.meta.target[0]; // e.g., 'email' or 'phone_number'
      const userFriendlyField = field.includes('email') ? 'email' : 'phone';
      
      return res.status(409).json({ // 409 Conflict
        message: `An employee with this ${userFriendlyField} already exists.`,
        errors: {
          [userFriendlyField]: `This ${userFriendlyField} is already in use.`,
        },
      });
    }

    // Generic fallback error
    console.error("Failed to update employee:", error);
    res.status(500);
    throw new Error("An unexpected error occurred while updating the employee.");
  }
});

module.exports = { editEmployee };