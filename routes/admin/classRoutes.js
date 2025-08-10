const { createClass, 
        getClasses, 
        getClassById, 
        editClass, 
        deleteClass, 
        addStudentsToClass, 
        addSubjectsToClass,
        listAllSubjectsInClass,
        listAllStudentsInClass, 
        deleteStudentFromClass,
        deleteSubjectsFromClass,
        getAcademicYearList,
        getTeacherList, 
        getStandardsAndSections,
        getStudentsByClass,
        listAllUnassignedStudents,
        listAvailableSubjectsForClass,
        getAllTimetables,
        getTimetableById, 
        deleteTimetable,
        createTimetable,
        updateTimetable
        } = require("../../controllers/admin/class/classController");


const express = require('express');
const authMiddleware = require("../../middleware/authMiddleware");
const router = express.Router();


// --- Correct Route Order ---
// Static routes are placed before dynamic (parameterized) routes to ensure they are matched correctly.

router.use(authMiddleware);
// Utility/List routes (Static)
// These must come before '/:id' to avoid being treated as a dynamic parameter.
router.get('/teachers', getTeacherList); // Get list of teachers
router.get('/academic-years', getAcademicYearList); // Get list of academic years
router.get('/standards-and-sections', getStandardsAndSections); // Get standards and sections
router.get('/students', getStudentsByClass); // Get students by class

router.get('/timetables', getAllTimetables); // Get all timetables
router.post('/timetable', createTimetable); // Create a new timetable for a class
router.put('/timetable/:id', updateTimetable); // Update or create a timetable by ID
router.get('/timetable/:id', getTimetableById); // Get timetable by ID')
router.delete('/timetable/:id', deleteTimetable); // Delete a timetable by ID

// Main Class operations
router.get('/', getClasses); // Get all classes
router.post('/create-class', createClass); // Create a new class (Static, but logically grouped here)

// Class operations by ID (Dynamic)
// These routes with parameters come after the more specific static routes above.
router.get('/:id', getClassById); // Get class by ID
router.put('/:id', editClass); // Update class details
router.delete('/:id', deleteClass); // Delete a class


// Nested Student routes
router.get('/students/unassigned', listAllUnassignedStudents); // List all unassigned students
router.get('/:classId/students', listAllStudentsInClass); // List all students in a class
router.post('/:classId/students', addStudentsToClass); // Add students to a class
router.delete('/:classId/students/:studentId', deleteStudentFromClass); // Delete a student from a class


// Nested Subject routes
router.get('/:classId/subjects', listAllSubjectsInClass); // List all subjects in a class
router.post('/:classId/subjects', addSubjectsToClass); // Add subjects to a class
router.get('/:classId/available-subjects', listAvailableSubjectsForClass); // List available subjects for a class
router.delete('/:classId/subjects/:subjectId', deleteSubjectsFromClass); // Delete a subject from a class


module.exports = router;