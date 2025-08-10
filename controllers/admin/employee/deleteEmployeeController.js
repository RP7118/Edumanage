const asyncHandler = require("express-async-handler");
const { PrismaClient } = require("../../../generated/prisma");

const prisma = new PrismaClient();

/**
 * @description Delete an employee
 * @route DELETE /api/admin/employees/:id
 * @access Private/Admin
 */
const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await prisma.employee.findUnique({
    where: { employee_id: id },
  });

  if (!employee) {
    res.status(404);
    throw new Error("Employee not found");
  }

  await prisma.employee.delete({
    where: {
      employee_id: id,
    },
  });

  res.status(200).json({ message: "Employee deleted successfully" });
});

module.exports = { deleteEmployee };
