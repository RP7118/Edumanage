const authMiddleware = async (req, res, next) => {
    req.user = {};
    req.user.user_id = process.env.ADMIN_USER_ID; // Set the user_id to the admin user ID
    next();
}

module.exports = authMiddleware;