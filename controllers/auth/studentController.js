const { PrismaClient } = require('../../generated/prisma/index.js');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../../utils/jwt.js');

const prisma = new PrismaClient();

/**
 * @route   POST /api/auth/student/login
 * @desc    Authenticate a student using username, set JWT cookie, and return student info
 * @access  Public
 */
const studentLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user || user.role !== 'student' || !user.is_active) {
            return res.status(401).json({ message: 'Invalid credentials or you are not an active student.' });
        }

        // Compare the submitted password directly with the one in the database
        const isMatch = password === user.password;
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const student = await prisma.student.findUnique({
            where: { user_id: user.user_id },
        });

        if (!student) {
            return res.status(500).json({ message: 'Could not find associated student details for this user.' });
        }

        // Optional: Check if student.status is active
        if (student.status !== 'active') {
            return res.status(403).json({ message: 'Student account is not active.' });
        }

        const token = generateToken(user.user_id, student.student_id, user.role);

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        await prisma.user.update({
            where: { user_id: user.user_id },
            data: { last_login: new Date() },
        });

        res.status(200).json({
            success: true,
            student: {
                id: student.student_id,
                name: `${student.first_name} ${student.last_name}`,
                // email: user.email, // Uncomment if you have email in User model
                role: user.role
            },
        });
    } catch (error) {
        console.error("Student login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

/**
 * @route   POST /api/auth/student/logout
 * @desc    Logs out the student by clearing the cookie
 * @access  Private
 */
const logoutStudent = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0), // Set expiration to a past date
    });
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

/**
 * @route   GET /api/auth/student/verify
 * @desc    Verify student authentication status via JWT cookie
 * @access  Private (requires cookie)
 */
const verifyStudentCookie = async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated: No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Only allow if role is student
        if (decoded.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Forbidden: Not a student.' });
        }

        const student = await prisma.student.findUnique({
            where: {
                student_id: decoded.employeeId, // employeeId is actually studentId in student context
            },
            select: {
                student_id: true,
                first_name: true,
                last_name: true,
                status: true,
                user: {
                    select: {
                        is_active: true,
                        role: true,
                    }
                }
            }
        });

        if (
            !student ||
            !student.user.is_active ||
            student.user.role !== 'student' ||
            student.status !== 'active'
        ) {
            return res.status(403).json({ success: false, message: 'Forbidden: User not found or not an active student.' });
        }

        res.status(200).json({
            success: true,
            student: {
                id: student.student_id,
                name: `${student.first_name} ${student.last_name}`,
                role: student.user.role
            },
        });

    } catch (error) {
        console.error("Cookie verification error:", error.message);
        return res.status(401).json({ success: false, message: 'Not authenticated: Invalid token.' });
    }
};

module.exports = { studentLogin, logoutStudent, verifyStudentCookie };