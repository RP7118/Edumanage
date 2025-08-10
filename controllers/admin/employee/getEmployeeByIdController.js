const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

/**
 * @description Get employee by ID
 * @route GET /api/admin/employees/:id
 * @access Private/Admin
 */
const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await prisma.employee.findUnique({
    where: {
      employee_id: id,
    },
    include: {
      department: true,
      salaries: {
        orderBy: { effective_from_date: "desc" },
        take: 1,
      },
      documents: true,
      taughtClasses: {
        select: { class_name: true },
      },
      courseOfferings: {
        include: {
          subject: {
            select: { subject_name: true },
          },
        },
      },
    },
  });

  if (!employee) {
    res.status(404);
    throw new Error("Employee not found");
  }

  // Map to the format expected by the frontend
  const latestSalary = employee.salaries[0] || {
    basic_salary: 0,
    allowances: 0,
    deductions: 0,
  };

  const formattedEmployee = {
    id: employee.employee_id,
    name: employee.full_name,
    avatar: employee.profile_avatar_url || "https://via.placeholder.com/150",
    designation: employee.role,
    status: employee.status,
    email: employee.email,
    phone: employee.phone_number,
    dob: employee.dob,
    address: employee.address,
    department: employee.department?.department_name || "N/A",
    experience: employee.years_of_experience,
    joiningDate: employee.joining_date,
    employeeId: employee.employee_code,
    role: employee.role,
    employmentType: employee.employment_type,
    qualification: employee.highest_qualification,
    classes: employee.taughtClasses.map((c) => c.class_name),
    subjects: [
      ...new Set(employee.courseOfferings.map((co) => co.subject.subject_name)),
    ],
    salary: {
      basic: latestSalary.basic_salary,
      allowances: latestSalary.allowances,
      deductions: latestSalary.deductions,
    },
    documents: employee.documents.map((doc) => ({
      id: doc.document_id,
      name: doc.document_name,
      type: doc.document_type,
      verified: doc.is_verified,
      url: doc.file_url,
    })),
    // NOTE: Attendance and Leaves are not in the schema
    attendance: [],
    leaves: [],
  };

  res.status(200).json(formattedEmployee);
});

module.exports = { getEmployeeById };
