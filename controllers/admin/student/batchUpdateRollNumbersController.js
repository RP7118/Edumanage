const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('../../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @desc    Batch update or reset student roll numbers.
 * @route   PUT /api/admin/student/roll-numbers/batch-update
 * @access  Private (Admin)
 * @body    [{ "admissionId": "uuid-string", "rollNo": "new-roll-no" | null }]
 */
const batchUpdateRollNumbers = asyncHandler(async (req, res) => {
  const updates = req.body;

  // 1. Validate input
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400); // Bad Request
    throw new Error('Request body must be a non-empty array of student updates.');
  }

  // Further validation to ensure each object has the required 'admissionId'
  for (const update of updates) {
    if (!update.admissionId) {
      res.status(400); // Bad Request
      throw new Error('Each object in the array must contain an "admissionId".');
    }
  }

  // 2. Prepare the array of update operations for the transaction
  const updatePromises = updates.map(update =>
    prisma.admission.update({
      where: {
        admission_id: update.admissionId,
      },
      data: {
        // Set roll_number to the provided value or null to reset it
        roll_number: update.rollNo,
      },
    })
  );

  // 3. Execute all updates within a single transaction
  // The $transaction API ensures that if any single update fails, all previous
  // updates in the batch are rolled back, maintaining data integrity.
  const result = await prisma.$transaction(updatePromises);

  // 4. Send the successful response
  res.status(200).json({
    message: `Successfully updated ${result.length} student roll numbers.`,
    data: {
      count: result.length,
    },
  });
});

module.exports = { batchUpdateRollNumbers };