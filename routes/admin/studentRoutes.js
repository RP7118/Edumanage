const { createStudent,
        getStudents,
        getStudentById,
        editStudent,
        getStudentsByClass,
        batchUpdateRollNumbers,
        getStudentCredentials,
        setStudentCredentials,
        promoteStudents,
        getStudentAttendance,
        upsertStudentAttendance
        } = require("../../controllers/admin/student/studentController");
const express = require("express");
const router = express.Router();

router.post("/create-student", createStudent);
router.get('/', getStudents);

router.get('/by-class', getStudentsByClass);
router.patch('/roll-numbers/batch-update', batchUpdateRollNumbers);

router.get('/credentials', getStudentCredentials);
router.post('/set-credentials', setStudentCredentials);

router.post('/promote-students', promoteStudents);

router.get('/attendance', getStudentAttendance);
router.post('/attendance', upsertStudentAttendance);

router.get('/:id', getStudentById)
router.patch('/:id', editStudent); 



module.exports = router;