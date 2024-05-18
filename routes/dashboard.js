require('dotenv').config();
const express = require('express');
const router = express.Router();

function isAdminAuthenticated(req, res, next) {
    // Check if user is authenticated and is an admin
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    // If not authenticated or not an admin, redirect to admin login
    res.redirect('/admin/login');
}

router.get('/', isAdminAuthenticated, (req, res) => {
    res.render('dashboard'); // Assuming you have a dashboard view
});

router.get('/addMovieRoute', isAdminAuthenticated, (req, res) => {
    res.render('addMovieList.hbs');
});

router.get('/updateMovieRoute', isAdminAuthenticated, (req, res) => {
    res.redirect('/edit-movie-list'); // Assuming you have an updateMovie view
});

router.get('/deleteMovieRoute', isAdminAuthenticated, (req, res) => {
    res.redirect('/delete-movie');
});

router.get('/addShowsRoute', isAdminAuthenticated, (req, res) => {
    res.render('addShowsList.hbs');
});

router.get('/updateShowsRoute', isAdminAuthenticated, (req, res) => {
    res.redirect('/edit-shows-list');
});

module.exports = router;