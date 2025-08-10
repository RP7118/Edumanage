const { PrismaClient } = require('../../generated/prisma/index.js');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../../utils/jwt.js');

const prisma = new PrismaClient();

/**
 * @route   POST /api/auth/teacher/login
 * @desc    Authenticate a teacher using username, set JWT cookie, and return teacher info
 * @access  Public
 */
const teacherLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user || user.role !== 'teacher' || !user.is_active) {
            return res.status(401).json({ message: 'Invalid credentials or you are not an active teacher.' });
        }

        // Compare the submitted password directly with the one in the database
        const isMatch = password === user.password;
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const teacher = await prisma.employee.findUnique({
            where: { user_id: user.user_id },
        });

        if (!teacher) {
            return res.status(500).json({ message: 'Could not find associated employee details for this user.' });
        }

        const token = generateToken(user.user_id, teacher.employee_id, user.role);

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
            teacher: {
                id: teacher.employee_id,
                name: teacher.full_name,
                email: teacher.email,
                role: user.role
            },
        });
    } catch (error) {
        console.error("Teacher login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

/**
 * @route   POST /api/auth/teacher/logout
 * @desc    Logs out the teacher by clearing the cookie
 * @access  Private
 */
const logoutTeacher = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0), // Set expiration to a past date
    });
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
};


/**
 * @route   GET /api/auth/teacher/verify
 * @desc    Verify user authentication status via JWT cookie
 * @access  Private (requires cookie)
 */
const verifyTeacherCookie = async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated: No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const teacher = await prisma.employee.findUnique({
            where: {
                employee_id: decoded.employeeId,
                user: {
                    is_active: true,
                    role: 'teacher'
                }
            },
            select: {
                employee_id: true,
                full_name: true,
                email: true,
                role: true,
            }
        });

        if (!teacher) {
            return res.status(403).json({ success: false, message: 'Forbidden: User not found or not an active teacher.' });
        }

        res.status(200).json({
            success: true,
            teacher: {
                id: teacher.employee_id,
                name: teacher.full_name,
                email: teacher.email,
                role: teacher.role
            },
        });

    } catch (error) {
        console.error("Cookie verification error:", error.message);
        return res.status(401).json({ success: false, message: 'Not authenticated: Invalid token.' });
    }
};

module.exports = { teacherLogin, logoutTeacher, verifyTeacherCookie };
