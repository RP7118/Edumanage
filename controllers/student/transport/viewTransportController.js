const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Get all available transport buses
 * @route   GET /api/student/transport/buses
 * @access  Private (Student)
 */
const getAllBuses = asyncHandler(async (req, res) => {
  // Fetch all active buses and include their driver and stops
  const buses = await prisma.bus.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      driver: {
        select: {
          full_name: true,
        },
      },
      stops: {
        orderBy: {
          stop_order: 'asc', // Order stops by their sequence
        },
        select: {
          name: true,
        },
      },
    },
  });

  // Check if any buses were found
  if (!buses || buses.length === 0) {
    res.status(404);
    throw new Error('No available buses found.');
  }

  // Format the data to match the frontend component's expectations
  const formattedBuses = buses.map((bus) => {
    // Construct the route string from the start point, stops, and end point
    const stopNames = bus.stops.map((stop) => stop.name);
    const routeString = [bus.route_from, ...stopNames, bus.route_to]
      .filter(Boolean) // Remove any empty or null parts
      .join(' → ');

    return {
      id: bus.id,
      busNumber: bus.number,
      driverName: bus.driver?.full_name || 'Not Assigned', // Handle null driver
      route: routeString,
    };
  });

  res.status(200).json(formattedBuses);
});

module.exports = {
  getAllBuses,
};