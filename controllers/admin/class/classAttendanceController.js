const asyncHandler = require('express-async-handler');
const { PrismaClient, Prisma } = require('../../../generated/prisma');

const prisma = new PrismaClient();

/**
 * @desc    Get a summary list of all class timetables with pagination and filtering.
 * @route   GET /api/admin/class-timetables
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with the list of timetables and pagination details, or an error.
 *
 * @example req.query (for pagination and filtering)
 * {
 * "page": "1",
 * "limit": "10",
 * "search": "John Doe", // Searches by creator's username or class name
 * "class_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 * "section": "A",
 * "academic_year": "2024-2025",
 * "status": "ACTIVE" // Can be DRAFT, ACTIVE, or ARCHIVED
 * }
 *
 * @example res.json (Success)
 * {
 * "message": "Timetables retrieved successfully.",
 * "data": {
 * "data": [
 * {
 * "timetable_id": "b4c5d6e7-f8g9-h0i1-j2k3-l4m5n6o7p8q9",
 * "class_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 * "academic_year_id": "z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4",
 * "status": "ACTIVE",
 * "created_by_id": "u1v2w3x4-y5z6-7890-1234-567890abcdef",
 * "createdAt": "2023-10-27T10:00:00.000Z",
 * "updatedAt": "2023-10-27T11:00:00.000Z",
 * "class": {
 * "class_name": "Grade 10",
 * "section": "A"
 * },
 * "academicYear": {
 * "year_name": "2024-2025"
 * },
 * "createdBy": {
 * "username": "JohnDoe"
 * }
 * }
 * ],
 * "pagination": {
 * "total": 1,
 * "page": 1,
 * "limit": 10,
 * "totalPages": 1,
 * "hasNextPage": false,
 * "hasPrevPage": false
 * }
 * }
 * }
 */
const getAllTimetables = asyncHandler(async (req, res) => {
  // 1. Extract query parameters from the request
  const {
    page = '1',
    limit = '10',
    search,
    class_id,
    section,
    academic_year,
    status,
  } = req.query;

  // 2. Parse pagination parameters
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;

  // 3. Construct the 'where' clause for filtering
  const where = {};

  if (search) {
    where.OR = [
      {
        class: {
          class_name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
      {
        createdBy: {
          username: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  if (class_id) {
    where.class_id = class_id;
  }

  if (section) {
    // To filter by section, we need to access the related Class model
    where.class = {
      ...where.class, // a 'where' clause for the related model
      section: {
        equals: section,
        mode: 'insensitive',
      },
    };
  }
  
  if (academic_year) {
      // To filter by academic year name, we need to access the related AcademicYear model
      where.academicYear = {
          year_name: academic_year
      }
  }

  if (status) {
    where.status = status;
  }

  // 4. Perform database queries in a transaction for efficiency
  const [timetables, totalCount] = await prisma.$transaction([
    prisma.timetable.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: {
        updated_at: 'desc',
      },
      include: {
        // Include related data for a comprehensive summary
        class: {
          select: {
            class_name: true,
            section: true,
          },
        },
        academicYear: {
          select: {
            year_name: true,
          },
        },
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    }),
    prisma.timetable.count({ where }),
  ]);
  
  // 5. Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limitNumber);

  // 6. Send the response
  res.status(200).json({
    message: 'Timetables retrieved successfully.',
    data: {
      data: timetables,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    },
  });
});





/**
 * @desc Create a new timetable
 * @route POST /api/timetables
 * @access Private (e.g., Admin/Teacher)
 */
const createTimetable = asyncHandler(async (req, res) => {
  const { class_id, academic_year_id, slots } = req.body;
  const created_by_id = req.user.user_id; // Assuming user info is available from authentication middleware

  // Basic validation
  if (!class_id || !academic_year_id) {
    res.status(400);
    throw new Error('Class ID and Academic Year ID are required.');
  }

  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    res.status(400);
    throw new Error('Timetable slots must be provided as a non-empty array.');
  }

  if (!created_by_id) {
    res.status(401);
    throw new Error('User not authenticated. Cannot create timetable.');
  }

  try {
    // Check if a timetable for this class and academic year already exists
    const existingTimetable = await prisma.timetable.findUnique({
      where: {
        class_id_academic_year_id: {
          class_id,
          academic_year_id,
        },
      },
    });

    if (existingTimetable) {
      res.status(409); // Conflict
      throw new Error('Timetable for this Class and Academic Year already exists. Use the update endpoint to modify it.');
    }

    // Create new timetable and its slots within a transaction
    const newTimetable = await prisma.$transaction(async (tx) => {
      return await tx.timetable.create({
        data: {
          class_id,
          academic_year_id,
          created_by_id,
          slots: {
            create: slots.map(slot => ({
              day_of_week: slot.day_of_week,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_break: slot.is_break || false,
              subject_id: slot.subject_id || null,
              teacher_id: slot.teacher_id || null,
              room_number: slot.room_number || null,
            })),
          },
        },
        select: {
          timetable_id: true,
          class_id: true,
          academic_year_id: true,
          status: true,
          created_by_id: true,
          created_at: true,
          updated_at: true,
        },
      });
    });

    res.status(201).json({
      message: 'Timetable created successfully.',
      data: newTimetable,
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        res.status(400);
        throw new Error('Invalid data: One of the provided IDs (class, academic year, subject, or teacher) does not exist.');
      }
    }
    throw error;
  }
});

/**
 * @desc Update an existing timetable
 * @route PUT /api/timetables/:timetableId
 * @access Private (e.g., Admin/Teacher)
 */
const updateTimetable = asyncHandler(async (req, res) => {
  const { timetableId } = req.params; // Get timetableId from URL parameters
  const { class_id, academic_year_id, slots } = req.body;
  const updated_by_id = req.user.user_id; // Assuming user info is available from authentication middleware

  // Basic validation
  if (!timetableId) {
    res.status(400);
    throw new Error('Timetable ID is required to update.');
  }

  // At least one of these should be provided for an update
  if (!class_id && !academic_year_id && (!slots || slots.length === 0)) {
    res.status(400);
    throw new Error('No update data provided. Provide class_id, academic_year_id, or slots to update.');
  }

  if (slots && (!Array.isArray(slots) || slots.length === 0)) {
    res.status(400);
    throw new Error('Timetable slots must be provided as a non-empty array if updating.');
  }

  if (!updated_by_id) {
    res.status(401);
    throw new Error('User not authenticated. Cannot update timetable.');
  }

  try {
    const updatedTimetable = await prisma.$transaction(async (tx) => {
      // Find the existing timetable
      const existingTimetable = await tx.timetable.findUnique({
        where: { timetable_id: timetableId },
      });

      if (!existingTimetable) {
        res.status(404);
        throw new Error('Timetable not found.');
      }

      // Prepare data for update
      const updateData = {};
      if (class_id) updateData.class_id = class_id;
      if (academic_year_id) updateData.academic_year_id = academic_year_id;
      updateData.updated_by_id = updated_by_id; // Record who updated it

      // Handle slots update: delete existing and create new ones
      if (slots && Array.isArray(slots) && slots.length > 0) {
        // Delete existing slots associated with this timetable
        await tx.timetableSlot.deleteMany({
          where: { timetable_id: timetableId },
        });

        // Create new slots
        updateData.slots = {
          create: slots.map(slot => ({
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_break: slot.is_break || false,
            subject_id: slot.subject_id || null,
            teacher_id: slot.teacher_id || null,
            room_number: slot.room_number || null,
          })),
        };
      }

      // Perform the update
      return await tx.timetable.update({
        where: { timetable_id: timetableId },
        data: updateData,
        select: {
          timetable_id: true,
          class_id: true,
          academic_year_id: true,
          status: true,
          created_by_id: true,
          updated_by_id: true, // Include updated_by_id in the response
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    res.status(200).json({
      message: 'Timetable updated successfully.',
      data: updatedTimetable,
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        res.status(400);
        throw new Error('Invalid data: One of the provided IDs (class, academic year, subject, or teacher) does not exist.');
      }
      if (error.code === 'P2025') { // Record not found (e.g., if timetableId is invalid)
        res.status(404);
        throw new Error('Timetable not found for update.');
      }
    }
    throw error;
  }
});


/**
 * @desc    Get a single, comprehensive timetable by its ID, including all slots and related details.
 * @route   GET /api/admin/class-timetables/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. The timetable ID should be in the URL parameters.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with the complete timetable object or an error.
 *
 * @example req.params
 * {
 * "id": "b4c5d6e7-f8g9-h0i1-j2k3-l4m5n6o7p8q9"
 * }
 *
 * @example res.json (Success)
 * {
 * "message": "Timetable details retrieved successfully.",
 * "data": {
 * "timetable_id": "b4c5d6e7-f8g9-h0i1-j2k3-l4m5n6o7p8q9",
 * "class_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 * "academic_year_id": "z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4",
 * "status": "DRAFT",
 * // ... other timetable fields
 * "class": {
 * "class_name": "Grade 10",
 * "section": "A"
 * },
 * "academicYear": {
 * "year_name": "2024-2025"
 * },
 * "slots": [
 * {
 * "slot_id": "sl_1",
 * "day_of_week": "MONDAY",
 * "start_time": "09:00",
 * "end_time": "09:40",
 * "is_break": false,
 * "room_number": "101",
 * "subject": {
 * "subject_id": "s1s2s3s4-s5s6-s7s8-s9s0-s1s2s3s4s5s6",
 * "subject_name": "Mathematics"
 * },
 * "teacher": {
 * "employee_id": "t1t2t3t4-t5t6-t7t8-t9t0-t1t2t3t4t5t6",
 * "full_name": "Dr. Alan Turing"
 * }
 * },
 * {
 * "slot_id": "sl_2",
 * "day_of_week": "MONDAY",
 * "start_time": "10:20",
 * "end_time": "10:40",
 * "is_break": true,
 * "room_number": null,
 * "subject": null,
 * "teacher": null
 * }
 * // ... other slots
 * ]
 * }
 * }
 */
const getTimetableById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch the timetable using findUniqueOrThrow to handle "not found" cases automatically.
    // Use a deeply nested `include` to fetch all related data required by the frontend.
    const timetable = await prisma.timetable.findUniqueOrThrow({
      where: {
        timetable_id: id,
      },
      include: {
        class: {
          select: {
            class_name: true,
            section: true,
          },
        },
        academicYear: {
          select: {
            year_name: true,
          },
        },
        slots: {
          orderBy: {
            start_time: 'asc', // Order slots by their start time for a consistent order.
          },
          include: {
            subject: {
              select: {
                subject_id: true,
                subject_name: true,
              },
            },
            teacher: {
              select: {
                employee_id: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    // 2. Send the successful response
    res.status(200).json({
      message: 'Timetable details retrieved successfully.',
      data: timetable,
    });
  } catch (error) {
    // 3. Catch the specific error from findUniqueOrThrow when a record is not found.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404);
      throw new Error('Timetable not found.');
    }
    // Let the async handler manage other potential errors
    throw error;
  }
});


/**
 * @desc    Delete a specific timetable and all its associated slots.
 * @route   DELETE /api/admin/class-timetables/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object. The timetable ID should be in the URL parameters.
 * @param {object} res - Express response object.
 *
 * @returns {void} Sends a JSON response with a success message or an error.
 *
 * @example req.params
 * {
 * "id": "b4c5d6e7-f8g9-h0i1-j2k3-l4m5n6o7p8q9"
 * }
 *
 * @example res.json (Success - 200 OK)
 * {
 * "message": "Timetable deleted successfully."
 * }
 *
 * @example res.json (Error - 404 Not Found)
 * {
 * "message": "Timetable not found."
 * }
 */
const deleteTimetable = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Attempt to delete the timetable.
    // Thanks to `onDelete: Cascade` in the Prisma schema on the TimetableSlot model,
    // Prisma will automatically delete all associated slots in the same transaction.
    await prisma.timetable.delete({
      where: {
        timetable_id: id,
      },
    });

    // 2. Send the successful response.
    res.status(200).json({ message: 'Timetable deleted successfully.' });
  } catch (error) {
    // 3. Catch the specific error when the record to delete does not exist.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404);
      throw new Error('Timetable not found.');
    }
    // Let the async handler manage other potential errors.
    throw error;
  }
});


// Add the new function to the module exports
module.exports = {
  getAllTimetables, // From previous request
  createTimetable, // New function to create a timetable
  updateTimetable, // New function to update a timetable
  getTimetableById, // From previous request
  deleteTimetable,
};