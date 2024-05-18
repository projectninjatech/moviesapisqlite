const express = require('express');
const router = express.Router();
const isLoggedIn = require('./isLoggedin')
const db = require('../db')

router.post('/add-to-mylist/:movieId', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const movieId = req.params.movieId;
        console.log("User id for mylist", userId)
        console.log("Movie id for mylist", movieId)

        // Insert the user-movie association into the user_movies_mylist table
        db.run(`INSERT INTO user_movies_mylist (user_id, movie_id) VALUES (?, ?)`, [userId, movieId], async function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            // Fetch user details along with their mylist
            db.get(`SELECT users.*, GROUP_CONCAT(movie_id) AS mylist 
                    FROM users 
                    LEFT JOIN user_movies_mylist ON users._id = user_movies_mylist.user_id 
                    WHERE users._id = ? 
                    GROUP BY users._id`, [userId], function(err, row) {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }

                // Parse the mylist JSON array
                // const mylist = row.mylist ? row.mylist.split(',') : [];
                const mylist = row.mylist ? row.mylist.split(',').map(Number) : [];

                // Return user details including updated mylist as an array
                res.json({ success: true, user: { ...row, mylist } });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/remove-from-mylist/:movieId', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id; // Assuming user ID is stored in the 'id' property of the user object
        const movieId = req.params.movieId; // Extract movie ID from request parameters

        // Remove the movie association from the user_movies_mylist table
        db.run(`DELETE FROM user_movies_mylist WHERE user_id = ? AND movie_id = ?`, [userId, movieId], async function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            // Fetch user details along with their updated mylist
            db.get(`SELECT users.*, GROUP_CONCAT(movie_id) AS mylist 
                    FROM users 
                    LEFT JOIN user_movies_mylist ON users._id = user_movies_mylist.user_id 
                    WHERE users._id = ? 
                    GROUP BY users._id`, [userId], function(err, row) {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }

                // Parse the mylist JSON array
                // const mylist = row.mylist ? row.mylist.split(',') : [];
                const mylist = row.mylist ? row.mylist.split(',').map(Number) : [];

                // Return user details including updated mylist as an array
                res.json({ success: true, user: { ...row, mylist } });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



router.get('/mylist', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id; // Assuming user ID is stored in the 'id' property of the user object
        
        // Fetch movie IDs in the user's mylist from the user_movies_mylist table
        db.all(`SELECT movie_id FROM user_movies_mylist WHERE user_id = ?`, [userId], async function(err, rows) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            // Extract movie IDs from the result rows
            const movieIds = rows.map(row => row.movie_id);

            // Fetch details of movies in the user's mylist from the movies table
            db.all(`SELECT * FROM movies WHERE _id IN (${movieIds.map(() => '?').join(',')})`, movieIds, function(err, rows) {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }

                // res.json({ success: true, moviesInMyList: rows });
                const moviesInMyList = rows.map(movie => ({
                    ...movie,
                    genres: movie.genres.split(','),
                    genreIds: movie.genreIds.split(',').map(Number)
                }));

                res.json({ success: true, moviesInMyList });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;