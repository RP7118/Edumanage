const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

/**
 * --------------------------------------------------------------------------
 * Seed Data
 * --------------------------------------------------------------------------
 * Here we define the initial data that should be populated in the database.
 * This data is for foundational models that don't have dependencies on other tables.
 */

// Data for Departments
const departments = [
  { department_name: 'Academics' },
  { department_name: 'Administration' },
  { department_name: 'Library' },
  { department_name: 'Support Staff' },
  { department_name: 'IT Department' },
  { department_name: 'Finance' },
];

// Data for Academic Years
// We'll set the 2025-2026 year as the currently active one.
const academicYears = [
  {
    year_name: '2023-24',
    start_date: new Date('2023-06-01'),
    end_date: new Date('2024-05-31'),
    is_active: false,
  },
  {
    year_name: '2024-25',
    start_date: new Date('2024-06-01'),
    end_date: new Date('2025-05-31'),
    is_active: false,
  },
  {
    year_name: '2025-26',
    start_date: new Date('2025-06-01'),
    end_date: new Date('2026-05-31'),
    is_active: true, // Set the current academic year as active
  },
  {
    year_name: '2026-27',
    start_date: new Date('2026-06-01'),
    end_date: new Date('2027-05-31'),
    is_active: false,
  },
];


/**
 * --------------------------------------------------------------------------
 * Main Seeding Function
 * --------------------------------------------------------------------------
 * This function orchestrates the seeding process.
 * It uses Prisma's `upsert` to avoid creating duplicates on subsequent runs.
 */
async function main() {
  console.log('Starting the seeding process...');

  // Seed Departments
  console.log('Seeding departments...');
  for (const dept of departments) {
    const department = await prisma.department.upsert({
      where: { department_name: dept.department_name },
      update: {},
      create: {
        department_name: dept.department_name,
      },
    });
    console.log(`Created/updated department: ${department.department_name}`);
  }
  console.log('Departments seeded successfully.');

  // Seed Academic Years
  console.log('\nSeeding academic years...');
  for (const year of academicYears) {
    const academicYear = await prisma.academicYear.upsert({
      where: { year_name: year.year_name },
      update: {
        is_active: year.is_active // Allow updating the active status
      },
      create: {
        year_name: year.year_name,
        start_date: year.start_date,
        end_date: year.end_date,
        is_active: year.is_active,
      },
    });
    console.log(`Created/updated academic year: ${academicYear.year_name}`);
  }
  console.log('Academic years seeded successfully.');

  // --- NEW: Seed Admin User and Employee ---
  console.log('\nSeeding admin user and employee...');

  // 1. Create the admin user with a plain text password
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {}, // No fields to update if user already exists
    create: {
      username: 'admin',
      password: 'admin123', // Storing password in plain text
      role: 'admin',
    },
  });
  console.log(`Created/updated admin user: ${adminUser.username}`);

  // 2. Find the Administration department to link the employee
  const adminDepartment = await prisma.department.findUnique({
    where: { department_name: 'Administration' },
  });

  if (!adminDepartment) {
    console.error('Administration department not found. Cannot create admin employee.');
    return;
  }

  // 3. Create the admin employee and link to the user and department
  const adminEmployee = await prisma.employee.upsert({
    where: { employee_code: 'EMP-ADMIN' },
    update: {},
    create: {
      full_name: 'Admin User',
      email: 'admin@example.com',
      employee_code: 'EMP-ADMIN',
      joining_date: new Date(),
      role: 'admin',
      status: 'active',
      department: {
        connect: { department_id: adminDepartment.department_id },
      },
      user: {
        connect: { user_id: adminUser.user_id },
      },
    },
  });
  console.log(`Created/updated admin employee: ${adminEmployee.full_name}`);
  // --- END of new section ---


  console.log('\nSeeding process finished.');
}


/**
 * --------------------------------------------------------------------------
 * Script Execution
 * --------------------------------------------------------------------------
 * This block calls the main function and handles potential errors,
 * ensuring the Prisma Client disconnects properly.
 */
main()
  .catch((e) => {
    console.error('An error occurred while seeding the database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure the Prisma client is disconnected after the script runs
    await prisma.$disconnect();
  });