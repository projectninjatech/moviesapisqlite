const express = require('express');
const router = express.Router();
const db = require('../db')

router.get('/getMovies/:genreID?', async (req, res) => {
    try {
        const { genreID } = req.params;

        let query;
        let params = [];

        // Check if a genre is provided
        if (genreID) {
            if (genreID === "Netflix") {
                // Query movies by watch provider
                query = `SELECT * FROM movies WHERE watchProviders LIKE ?`;
                params = [`%${genreID}%`];
            } else {
                // Query movies by genre ID
                query = `SELECT * FROM movies WHERE genreIds LIKE ?`;
                params = [`%${genreID}%`];
            }
        } else {
            // If no genre is provided, return all movies
            query = `SELECT * FROM movies`;
        }

        // Execute the query
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            // res.json(rows);
            const moviesWithFormattedGenres = rows.map(movie => ({
                ...movie,
                genres: movie.genres.split(','),
                genreIds: movie.genreIds.split(',').map(Number)
            }));
    
            res.json(moviesWithFormattedGenres);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/getSimilarMovies/:movieID', async (req, res) => {
    try {
        const { movieID } = req.params;

        // Find the selected movie by its ID
        const selectedMovie = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM movies WHERE _id = ?`, [movieID], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        // Ensure the movie is found
        if (!selectedMovie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // Split the genreIds string of the selected movie into an array of individual genre IDs
        const genreIdsArray = selectedMovie.genreIds.split(',');

        // Fetch all movies from the database
        db.all(`SELECT * FROM movies`, async (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            try {
                // Filter similar movies
                const similarMovies = [];
                for (const movie of rows) {
                    const movieGenreIdsArray = movie.genreIds.split(',');
                    // Check if any genre ID of the selected movie matches any genre ID of the current movie
                    if (Number(movieID) !== movie.id && genreIdsArray.some(id => movieGenreIdsArray.includes(id))) {
                        similarMovies.push(movie);
                    }
                }

                // res.json(similarMovies);
                const similarMoviesWithFormattedGenres = similarMovies.map(movie => ({
                    ...movie,
                    genres: movie.genres.split(','),
                    genreIds: movie.genreIds.split(',').map(Number)
                }));
        
                res.json(similarMoviesWithFormattedGenres);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/searchMovies/:movieName', async (req, res) => {
    try {
        const { movieName } = req.params;

        // Use a case-insensitive LIKE query to perform a partial match on movie titles
        const matchingMovies = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM movies WHERE title LIKE '%' || ? || '%' COLLATE NOCASE`, [movieName], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // res.json(matchingMovies);
        const matchingMoviesWithFormattedGenres = matchingMovies.map(movie => ({
            ...movie,
            genres: movie.genres.split(','),
            genreIds: movie.genreIds.split(',').map(Number)
        }));

        res.json(matchingMoviesWithFormattedGenres);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;