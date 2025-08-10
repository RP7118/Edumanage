const { PrismaClient } = require("../../../generated/prisma");
const asyncHandler = require("express-async-handler");
const prisma = new PrismaClient();

/**
 * @desc    Add a new bus with its route and stops
 * @route   POST /api/admin/transport/buses
 * @access  Private (Admin)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 *
 * @example req.body
 * {
 * "name": "Sunset Express",
 * "number": "GJ-05-CD-5678",
 * "driverName": "Jane Smith",
 * "from": "City Center",
 * "departureTime": "16:00",
 * "to": "School Campus",
 * "arrivalTime": "17:30",
 * "stops": [
 * { "name": "Plaza Mall", "arrivalTime": "16:20" },
 * { "name": "Community Park", "arrivalTime": "16:45" }
 * ]
 * }
 *
 * @example res.body (Success 201)
 * {
 * "id": "b2c3d4e5-f6a7-8901-2345-67890abcdef1",
 * "name": "Sunset Express",
 * // ... other fields
 * "stops": [
 * { "id": "...", "name": "Plaza Mall", ... },
 * { "id": "...", "name": "Community Park", ... }
 * ]
 * }
 *
 * @example res.body (Error 400)
 * {
 * "message": "Bus number already exists."
 * }
 */
const newBus = asyncHandler(async (req, res) => {
  const { name, number, driverName, from, departureTime, to, arrivalTime, stops } = req.body;

  // --- Basic Validation ---
  if (!name || !number || !from || !departureTime || !to || !arrivalTime) {
    res.status(400);
    throw new Error("Please provide all required bus and route details.");
  }
  
  // --- Check for existing bus number ---
  const existingBus = await prisma.bus.findUnique({
    where: { number: number },
  });

  if (existingBus) {
    res.status(400);
    throw new Error("A bus with this number already exists.");
  }

  // --- Find Driver ID ---
  // Note: This assumes driver names are unique. For more robust systems,
  // the frontend should send a driver's employee_id.
  let driverId = null;
  if (driverName) {
    const driver = await prisma.employee.findFirst({
      where: { full_name: driverName },
    });
    
    if (driver) {
      driverId = driver.employee_id;
    } else {
      // Depending on requirements, you could either throw an error or proceed without a driver.
      // We will proceed without a driver if the name is not found.
      console.warn(`Driver with name "${driverName}" not found. Bus will be created without a driver.`);
    }
  }
  
  // --- Create Bus and Stops in a Transaction ---
  // A transaction ensures that if any stop fails to be created, the bus
  // itself is not created, maintaining data consistency.
  const newBus = await prisma.$transaction(async (tx) => {
    // 1. Create the parent Bus record
    const createdBus = await tx.bus.create({
      data: {
        name: name,
        number: number,
        driver_id: driverId,
        route_from: from,
        departure_time: departureTime,
        route_to: to,
        arrival_time: arrivalTime,
        status: 'ACTIVE', // Default status
      },
    });

    // 2. Create the child BusStop records if any exist
    if (stops && stops.length > 0) {
      const stopsData = stops.map((stop, index) => ({
        bus_id: createdBus.id,
        name: stop.name,
        arrival_time: stop.arrivalTime,
        stop_order: index + 1, // Use the array index to set the order
      }));

      await tx.busStop.createMany({
        data: stopsData,
      });
    }

    // 3. Return the complete bus data
    // We re-query the created bus to include the newly created stops in the response.
    const result = await tx.bus.findUnique({
      where: { id: createdBus.id },
      include: {
        stops: true,
        driver: {
          select: {
            full_name: true
          }
        }
      }
    });

    return result;
  });

  res.status(201).json(newBus);
});

module.exports = { newBus };
