const {createClass } = require("./newClassController");
const { getClasses } = require("./getClassesController");
const { getClassById } = require("./getClassIdController");
const { editClass } = require("./editClassController");
const { deleteClass } = require("./deleteClassController");
const { addStudentsToClass } = require("./addStudentsToClassController");
const { listAllStudentsInClass } = require("./listAllStudentsInClassController");
const { deleteStudentFromClass } = require("./deleteStudentsFromClassController");
const { addSubjectsToClass } = require("./addSubjectsToClassController");
const { listAllSubjectsInClass } = require("./listAllSubjectInClassController");
const { deleteSubjectsFromClass } = require("./deleteSubjectsFromClassController");
const { getTeacherList } = require("./getTeacherListController");
const { getAcademicYearList } = require("./getAcademicYearListController");
const { getStandardsAndSections } = require("./getStandardsAndSectionsController");
const { getStudentsByClass } = require("./getStudentByClassController");
const { listAllUnassignedStudents } = require("./listAllUnassignedStudentsController");
const { listAvailableSubjectsForClass } = require("./listAvailableSubjectController");
const { getAllTimetables, createTimetable, updateTimetable, getTimetableById, deleteTimetable } = require("./classAttendanceController")


module.exports = {
  createClass,
  getClasses,
  getClassById,
  editClass,
  deleteClass,
  addStudentsToClass,
  listAllStudentsInClass,
  deleteStudentFromClass,
  addSubjectsToClass,
  listAllSubjectsInClass,
  deleteSubjectsFromClass,
  getTeacherList,
  getAcademicYearList,
  getStandardsAndSections,
  getStudentsByClass,
  listAllUnassignedStudents,
  listAvailableSubjectsForClass,
  getAllTimetables,
  createTimetable,
  updateTimetable,
  getTimetableById,
  deleteTimetable
};