const express = require('express');
const router = express.Router();
const isLoggedIn = require('../routes/isLoggedin')
const db = require('../db')

router.post('/update-watched-time/:movieId', isLoggedIn, async (req, res) => {
    console.log("Update Movie watchtime")
    try {
        const userId = req.session.user._id;
        const movieId = req.params.movieId;
        const watchedTime = req.body.watchedTime; // Assuming you send the watched time in the request body

        console.log(`UserId ${userId} MovieId ${movieId} WatchedTime ${watchedTime}`)

        // Check if the movie is already in the user's watched movie list
        db.get(`SELECT * FROM user_watchedmovie_list WHERE user_id = ? AND movie_id = ?`, [userId, movieId], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (row) {
                // If the movie is already in the watched movie list, update the watched time
                db.run(`UPDATE user_watchedmovie_list SET watchedTime = ? WHERE user_id = ? AND movie_id = ?`, [watchedTime, userId, movieId], async (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    res.json({ success: true });
                });
            } else {
                // If the movie is not in the watched movie list, insert it
                db.run(`INSERT INTO user_watchedmovie_list (user_id, movie_id, watchedTime) VALUES (?, ?, ?)`, [userId, movieId, watchedTime], async (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    res.json({ success: true });
                });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/watched-movies', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id;

        // Fetch all watched movies for the user with their watched times and upload times
        db.all(`SELECT movies._id, movies.movieID, movies.backdropPath, movies.budget, movies.genres, movies.genreIds, 
        movies.originalTitle, movies.overview, movies.popularity, movies.posterPath, movies.productionCompanies, 
        movies.releaseDate, movies.revenue, movies.runtime, movies.status, movies.title, movies.watchProviders, 
        movies.logos, movies.downloadLink, movies.ratings, 
        user_watchedmovie_list.watchedTime, user_watchedmovie_list.uploadTime
        FROM movies
        INNER JOIN user_watchedmovie_list ON movies._id = user_watchedmovie_list.movie_id
        WHERE user_watchedmovie_list.user_id = ?`, [userId], async (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            // Map over the rows to format the watched movie details
            const watchedMovies = await Promise.all(rows.map(async (row) => {
                // Convert the uploadTime to a Date object
                const uploadTime = new Date(row.uploadTime);
                // Get the movie details from the row
                const movie = {
                    _id: row._id,
                    movieID: row.movieID,
                    backdropPath: row.backdropPath,
                    budget: row.budget,
                    genres: row.genres.split(',').map(genre => genre.trim()), // Convert genres to array
                    genreIds: row.genreIds.split(',').map(Number),
                    originalTitle: row.originalTitle,
                    overview: row.overview,
                    popularity: row.popularity,
                    posterPath: row.posterPath,
                    productionCompanies: row.productionCompanies,
                    releaseDate: row.releaseDate,
                    revenue: row.revenue,
                    runtime: row.runtime,
                    status: row.status,
                    title: row.title,
                    watchProviders: row.watchProviders,
                    logos: row.logos,
                    downloadLink: row.downloadLink,
                    ratings: row.ratings,
                };

                // Return the watched movie details
                return { movie, watchedTime: row.watchedTime, uploadTime };
            }));

            // Sort the watchedMovies based on the uploadTime in descending order
            watchedMovies.sort((a, b) => b.uploadTime - a.uploadTime);
            // watchedMovies.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));

            res.json({ success: true, watchedMovies });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/watched-time/:movieId', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const movieId = req.params.movieId;

        // Query the user_watchedmovie_list table to retrieve the watched time for the specified movie ID
        db.get(`SELECT watchedTime FROM user_watchedmovie_list WHERE user_id = ? AND movie_id = ?`, [userId, movieId], (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (row) {
                // If the movie is found in the user's watched movies, return the watched time
                res.json({ success: true, watchedTime: row.watchedTime });
            } else {
                // If the movie is not found in the user's watched movies, return 0 watched time
                res.json({ success: true, watchedTime: 0 });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/remove-watched-movie/:movieId', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const movieIdToRemove = req.params.movieId;

        // Check if the movie exists in the user's watched movie list
        db.get(`SELECT * FROM user_watchedmovie_list WHERE user_id = ? AND movie_id = ?`, [userId, movieIdToRemove], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (row) {
                // If the movie exists, remove it from the user's watched movie list
                db.run(`DELETE FROM user_watchedmovie_list WHERE user_id = ? AND movie_id = ?`, [userId, movieIdToRemove], async (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    res.json({ success: true, message: 'Movie removed from watched list successfully' });
                });
            } else {
                // If the movie is not found in the user's watched movie list, send a 404 response
                res.status(404).json({ success: false, message: 'Movie not found in watched list' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/remove-all-watched-movies', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Remove all entries from the user_watchedmovie_list table for the current user
        db.run(`DELETE FROM user_watchedmovie_list WHERE user_id = ?`, [userId], async (err) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, message: 'All watched movies removed successfully' });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;