const { PrismaClient } = require("../../../generated/prisma");
const asyncHandler = require("express-async-handler");
const prisma = new PrismaClient();

/**
 * @desc    Update an existing bus and its stops
 * @route   PUT /api/admin/transport/buses/:id
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
 * @example req.body
 * {
 * "name": "Morning Star (Renamed)",
 * "number": "GJ-01-XY-9999",
 * "driverId": "f0e9d8c7-b6a5-4321-fedc-ba9876543210",
 * "stops": [
 * { "name": "New First Stop", "arrivalTime": "07:10" }
 * ]
 * // ... other fields to update
 * }
 *
 * @example res.body (Success 200)
 * {
 * "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
 * "name": "Morning Star (Renamed)",
 * "stops": [ { ... } ],
 * // ... full updated bus object
 * }
 */
const updateBus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, number, driverId, from, departureTime, to, arrivalTime, status, stops } = req.body;

    // --- Find the existing bus ---
    const existingBus = await prisma.bus.findUnique({
        where: { id: id },
    });

    if (!existingBus) {
        res.status(404);
        throw new Error("Bus not found.");
    }

    // --- Check for bus number conflict if it's being changed ---
    if (number && number !== existingBus.number) {
        const busWithSameNumber = await prisma.bus.findUnique({
            where: { number: number },
        });

        if (busWithSameNumber) {
            res.status(400);
            throw new Error("A bus with this number already exists.");
        }
    }

    // --- Perform update in a transaction ---
    // This ensures that updating the bus and its stops is an atomic operation.
    // If updating stops fails, the changes to the bus details will be rolled back.
    const updatedBus = await prisma.$transaction(async (tx) => {
        // 1. Update the main bus details
        const busUpdate = await tx.bus.update({
            where: { id: id },
            data: {
                name: name || existingBus.name,
                number: number || existingBus.number,
                driver_id: driverId, // Allow setting driver to null by passing null
                route_from: from || existingBus.route_from,
                departure_time: departureTime || existingBus.departure_time,
                route_to: to || existingBus.route_to,
                arrival_time: arrivalTime || existingBus.arrival_time,
                status: status || existingBus.status,
            },
        });

        // 2. If stops are provided, replace the existing ones
        if (stops && Array.isArray(stops)) {
            // A. Delete all old stops for this bus
            await tx.busStop.deleteMany({
                where: { bus_id: id },
            });

            // B. Create the new stops
            if (stops.length > 0) {
                const stopsData = stops.map((stop, index) => ({
                    bus_id: id,
                    name: stop.name,
                    arrival_time: stop.arrivalTime,
                    stop_order: index + 1,
                }));

                await tx.busStop.createMany({
                    data: stopsData,
                });
            }
        }
        
        // 3. Fetch and return the fully updated bus data with relations
        return tx.bus.findUnique({
            where: { id: id },
            include: {
                stops: {
                    orderBy: {
                        stop_order: 'asc',
                    },
                },
                driver: {
                    select: {
                        full_name: true,
                    },
                },
            },
        });
    });

    res.status(200).json(updatedBus);
});

module.exports = { updateBus };