const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

/**
 * @description Get all employees with filtering
 * @route GET /api/admin/employees
 * @access Private/Admin
 */
const getEmployees = asyncHandler(async (req, res) => {
  const { search, department, role, status } = req.query;

  const where = {};

  if (search) {
    where.OR = [
      { full_name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employee_code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (department) {
    where.department = { department_name: department };
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: {
        select: {
          department_name: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Map to the format expected by the frontend
  const formattedEmployees = employees.map((emp) => ({
    id: emp.employee_id,
    name: emp.full_name,
    avatar: emp.profile_avatar_url || "https://via.placeholder.com/150",
    employeeId: emp.employee_code,
    designation: emp.role,
    department: emp.department?.department_name || "N/A",
    email: emp.email,
    phone: emp.phone_number,
    status: emp.status,
  }));

  res.status(200).json(formattedEmployees);
});

module.exports = { getEmployees };
