function isLoggedIn(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
}

module.exports = isLoggedIn;