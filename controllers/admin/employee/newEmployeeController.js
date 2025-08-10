// Import necessary packages and modules
const { PrismaClient, employee_role_enum, gender_enum, employee_status_enum, user_role_enum } = require('../../../generated/prisma');
const { z } = require('zod');
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

// --- HELPER FUNCTIONS ---

class BusinessLogicError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "BusinessLogicError";
    this.statusCode = statusCode;
  }
}

async function getNextEmployeeCode(tx) {
  const lastEmployee = await tx.employee.findFirst({
    orderBy: { employee_code: 'desc' },
    select: { employee_code: true },
  });

  let nextNum = 1;
  if (lastEmployee && lastEmployee.employee_code) {
    const numMatch = lastEmployee.employee_code.match(/\d+$/);
    if (numMatch) {
      nextNum = parseInt(numMatch[0], 10) + 1;
    }
  }
  return 'EMP' + String(nextNum).padStart(5, '0');
}

function generateRandomPassword() {
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&?";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
}

function mapEmployeeRoleToUserRole(role) {
    switch(role) {
        case employee_role_enum.teacher: return user_role_enum.teacher;
        case employee_role_enum.admin: return user_role_enum.admin;
        default: return user_role_enum.staff;
    }
}


// --- ZOD SCHEMA FOR INPUT VALIDATION ---
const createEmployeeSchema = z.object({
  name: z.string({ required_error: 'Full name is required.' }).min(1),
  email: z.string({ required_error: 'Email is required.' }).email(),
  phone: z.string({ required_error: 'Phone number is required.' }).min(10),
  gender: z.nativeEnum(gender_enum),
  dob: z.string({ required_error: 'Date of birth is required.' }).refine((d) => !isNaN(Date.parse(d))),
  address: z.string().optional().nullable(),
  department: z.string({ required_error: 'Department is required.' }).min(1),
  designation: z.string({ required_error: 'Designation is required.' }).min(1),
  role: z.nativeEnum(employee_role_enum),
  employmentType: z.string().optional().nullable(),
  qualification: z.string().max(255).optional().nullable(),
  experience: z.coerce.number().int().min(0).optional().nullable(),
  joiningDate: z.string({ required_error: 'Joining date is required.' }).refine((d) => !isNaN(Date.parse(d))),
  salary: z.object({
    basic: z.coerce.number({ required_error: 'Basic salary is required.' }).positive(),
    allowances: z.coerce.number().min(0).default(0).optional(),
    deductions: z.coerce.number().min(0).default(0).optional(),
  }).optional(),
  documents: z.array(z.object({
    documentName: z.string().min(1),
    documentType: z.string().max(100).optional().nullable(),
    fileUrl: z.string().url(),
  })).optional(),
});


// --- CONTROLLER: createEmployee ---
const createEmployee = async (req, res) => {
  try {
    const validatedData = createEmployeeSchema.parse(req.body);

    const { department: departmentName, salary, documents, ...employeeData } = validatedData;

    const { newEmployee, password } = await prisma.$transaction(async (tx) => {
      
    const existingDepartment = await tx.department.findUnique({
        where: { department_name: departmentName },
        select: { department_id: true }
      });

      if (!existingDepartment) {
        throw new BusinessLogicError(`Department '${departmentName}' not found.`);
      }

      const employeeCode = await getNextEmployeeCode(tx);
      const randomPassword = generateRandomPassword();
      
      // --- FIX: Use a Nested Write for User and Employee Creation ---
      const employee = await tx.employee.create({
        data: {
          employee_code: employeeCode,
          full_name: employeeData.name,
          email: employeeData.email,
          phone_number: employeeData.phone,
          gender: employeeData.gender,
          dob: new Date(employeeData.dob),
          address: employeeData.address,
          highest_qualification: employeeData.qualification,
          years_of_experience: employeeData.experience,
          joining_date: new Date(employeeData.joiningDate),

          department: {
            connect: {
            department_id: existingDepartment.department_id,
            }
          },

          role: employeeData.role,
          designation: employeeData.designation,
          employment_type: employeeData.employmentType,
          status: employee_status_enum.active,
          // This is the nested write.
          user: {
            create: {
              username: employeeCode, // Use the unique employee code as the username
              password: randomPassword,
              role: mapEmployeeRoleToUserRole(employeeData.role),
            }
          }
        },
      });
      // --- END FIX ---

      if (salary) {
        await tx.employeeSalary.create({
          data: {
            employee_id: employee.employee_id,
            basic_salary: salary.basic,
            allowances: salary.allowances,
            deductions: salary.deductions,
            effective_from_date: new Date(employeeData.joiningDate),
          },
        });
      }

      if (documents && documents.length > 0) {
        await tx.employeeDocument.createMany({
          data: documents.map((doc) => ({
            employee_id: employee.employee_id,
            document_name: doc.documentName,
            document_type: doc.documentType,
            file_url: doc.fileUrl,
          })),
        });
      }
      
      return { newEmployee: employee, password: randomPassword };
    });

    res.status(201).json({
      message: 'Employee and user account created successfully!',
      data: {
        employeeId: newEmployee.employee_id,
        employeeCode: newEmployee.employee_code,
      },
      generatedPassword: password,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'There are errors in the submitted data.', errors: error.flatten().fieldErrors });
    } 
    if (error instanceof BusinessLogicError) {
      return res.status(error.statusCode).json({ message: error.message });
    } 
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      const userFriendlyField = field.includes('email') ? 'email' : (field.includes('phone') ? 'phone' : (field.includes('username') ? 'username' : 'value'));
      return res.status(409).json({ message: `An account with this ${userFriendlyField} already exists.` });
    } 
    console.error('Unexpected Error:', error);
    return res.status(500).json({ message: 'An unexpected server error occurred.' });
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  createEmployee,
};