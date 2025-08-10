const { PrismaClient } = require('../../../generated/prisma');
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

/**
 * @desc    Get standards and sections.
 * - If no query param, returns all standards with their respective sections.
 * - If 'standard' query param is present, returns unique sections for that standard.
 * @route   GET /api/v1/admin/classes/standards-and-sections
 * @access  Private (Admin)
 *
 * @query   ?standard - (Optional) The standard to fetch sections for.
 *
 * @returns {
 * success: true,
 * data: object[] | string[],
 * message: string
 * }
 *
 * @example
 * // 1. To get all standards and their sections
 * GET /api/v1/admin/classes/standards-and-sections
 * // Sample Response Body:
 * // {
 * //   "success": true,
 * //   "data": [
 * //     { "standard": "9th", "sections": ["A", "B"] },
 * //     { "standard": "10th", "sections": ["A", "B", "C"] }
 * //   ],
 * //   "message": "Successfully fetched all standards and their sections."
 * // }
 *
 * @example
 * // 2. To get all unique sections for '10th' standard
 * GET /api/v1/admin/classes/standards-and-sections?standard=10th
 * // Sample Response Body:
 * // {
 * //   "success": true,
 * //   "data": ["A", "B", "C"],
 * //   "message": "Successfully fetched sections for standard 10th."
 * // }
 */
const getStandardsAndSections = asyncHandler(async (req, res) => {
  const { standard: standardQuery } = req.query;

  try {
    // Scenario 1: A specific standard is provided, fetch only its sections
    if (standardQuery) {
      const sectionsData = await prisma.class.findMany({
        where: {
          standard: standardQuery,
        },
        distinct: ['section'],
        select: {
          section: true,
        },
        orderBy: {
          section: 'asc',
        },
      });

      // Map the array of objects to a simple array of strings
      const sections = sectionsData.map((item) => item.section);

      return res.status(200).json({
        success: true,
        data: sections,
        message: `Successfully fetched sections for standard ${standardQuery}.`,
      });
    }

    // Scenario 2: No standard is provided, fetch all standards and their respective sections
    const allStandardsAndSections = await prisma.class.findMany({
      select: {
        standard: true,
        section: true,
      },
      orderBy: [{ standard: 'asc' }, { section: 'asc' }],
    });

    if (allStandardsAndSections.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No standards or sections found.',
      });
    }

    // Use a Map to group unique sections by standard
    const standardsMap = new Map();
    allStandardsAndSections.forEach((item) => {
      if (!standardsMap.has(item.standard)) {
        standardsMap.set(item.standard, new Set());
      }
      standardsMap.get(item.standard).add(item.section);
    });

    // Convert the map to the desired array of objects structure
    const structuredData = Array.from(standardsMap.entries()).map(
      ([standard, sectionsSet]) => ({
        standard: standard,
        sections: Array.from(sectionsSet).sort(), // Convert Set to sorted array
      })
    );

    res.status(200).json({
      success: true,
      data: structuredData,
      message: 'Successfully fetched all standards and their sections.',
    });
  } catch (error) {
    console.error('Error fetching standards and sections:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = { getStandardsAndSections };