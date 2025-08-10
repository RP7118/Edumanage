const { PrismaClient } = require("../../../generated/prisma");
const asyncHandler = require("express-async-handler");
const prisma = new PrismaClient();


/**
 * @desc    Delete a bus by its ID
 * @route   DELETE /api/admin/transport/buses/:id
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
 * "message": "Bus and all its associated stops have been deleted successfully.",
 * "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 * }
 *
 * @example res.body (Error 404)
 * {
 * "message": "Bus not found."
 * }
 */
const deleteBus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Using a transaction to ensure the find and delete operations are atomic.
    // This prevents a race condition where the bus could be deleted by another process
    // after we've checked for its existence but before we delete it.
    const result = await prisma.$transaction(async (tx) => {
        const busToDelete = await tx.bus.findUnique({
            where: { id: id },
        });

        if (!busToDelete) {
            res.status(404);
            throw new Error("Bus not found.");
        }

        // The 'onDelete: Cascade' in the Prisma schema automatically handles
        // deleting all associated BusStop records. We only need to delete the bus.
        await tx.bus.delete({
            where: { id: id },
        });

        return busToDelete;
    });

    res.status(200).json({
        message: "Bus and all its associated stops have been deleted successfully.",
        id: result.id,
    });
});

module.exports = { deleteBus };
