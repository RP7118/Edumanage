const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
const port = process.env.PORT || 5005;

// Admin Routes
const employeeAdminRoutes = require('./routes/admin/employeeRoutes');
const studentAdminRoutes = require("./routes/admin/studentRoutes");
const classAdminRoutes = require("./routes/admin/classRoutes");
const subjectAdminRoutes = require("./routes/admin/subjectRoutes");
const schoolRoutes = require("./routes/admin/schoolRoutes");
const transportRoutes = require("./routes/admin/transportRoutes");

// Teacher Routes
const teacherRoutes = require('./routes/teacher/teacherRoutes');

// Student Routes
const studentRoutes = require('./routes/student/studentRoutes');

// Auth Routes
const authTeacherRoutes = require('./routes/auth/authTeacherRoutes');
const authStudentRoutes = require('./routes/auth/authStudentRoutes');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL],
    credentials: true // Allow cookies to be sent
}));
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send('Hello World!');
}
);

// Auth
app.use('/api/auth/teacher', authTeacherRoutes);
app.use('/api/auth/student', authStudentRoutes);

// Admin Routes
app.use("/api/admin/employee", employeeAdminRoutes);
app.use("/api/admin/student", studentAdminRoutes);
app.use("/api/admin/class", classAdminRoutes);
app.use("/api/admin/subject", subjectAdminRoutes);
app.use("/api/admin/school", schoolRoutes);
app.use("/api/admin/transport", transportRoutes);

// Teacher Routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}
);