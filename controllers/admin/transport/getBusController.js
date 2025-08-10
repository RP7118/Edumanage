const { PrismaClient } = require("../../../generated/prisma");
const asyncHandler = require("express-async-handler");
const prisma = new PrismaClient();

/**
 * @desc    Get all buses
 * @route   GET /api/admin/transport/buses
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example res.body (Success 200)
 * [
 * {
 * "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 * "name": "Morning Star",
 * "number": "GJ-01-AB-1234",
 * "status": "ACTIVE",
 * "route_from": "School Campus",
 * "route_to": "City Center",
 * "departure_time": "07:00",
 * "arrival_time": "08:30",
 * "driver": {
 * "full_name": "John Doe"
 * },
 * "_count": {
 * "stops": 5
 * }
 * }
 * ]
 */
const getAllBuses = asyncHandler(async (req, res) => {
  const buses = await prisma.bus.findMany({
    orderBy: {
      created_at: 'desc',
    },
    include: {
      // Include the driver's name for display in the list.
      driver: {
        select: {
          full_name: true,
        },
      },
      // Include a count of the stops for each bus, which is more efficient
      // than fetching the full stop objects for a list view.
      _count: {
        select: {
          stops: true,
        },
      },
    },
  });

  res.status(200).json(buses);
});


/**
 * @desc    Get a single bus by its ID
 * @route   GET /api/admin/transport/buses/:id
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example req.params
 * {
 * "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example res.body (Success 200)
 * {
 * "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 * "name": "Morning Star",
 * "number": "GJ-01-AB-1234",
 * // ... other bus fields
 * "driver": {
 * "employee_id": "f0e9d8c7-b6a5-4321-fedc-ba9876543210",
 * "full_name": "John Doe"
 * },
 * "stops": [
 * { "id": "...", "name": "First Stop", "arrival_time": "07:15", "stop_order": 1 },
 * { "id": "...", "name": "Second Stop", "arrival_time": "07:30", "stop_order": 2 }
 * ]
 * }
 *
 * @example res.body (Error 404)
 * {
 * "message": "Bus not found."
 * }
 */
const getBusById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bus = await prisma.bus.findUnique({
    where: {
      id: id,
    },
    include: {
      // Include full driver details
      driver: {
        select: {
          employee_id: true,
          full_name: true,
        }
      },
      // Include all stop details, ordered by their sequence
      stops: {
        orderBy: {
          stop_order: 'asc',
        },
      },
    },
  });

  if (!bus) {
    res.status(404);
    throw new Error("Bus not found.");
  }

  res.status(200).json(bus);
});


module.exports = { getAllBuses, getBusById };