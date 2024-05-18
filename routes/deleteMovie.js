// routes/deleteMovie.js
const express = require('express');
const router = express.Router();
const db = require('../db')

router.get('/delete-movie', async (req, res) => {
    try {
        // Query movies from the SQLite database
        db.all('SELECT * FROM movies', (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            // Render the 'deleteMovie' view with the fetched movies
            res.render('deleteMovie', { movies: rows });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/delete-movie/:id', async (req, res) => {
    try {
        const movieId = req.params.id;

        // Delete the movie from the movies table
        db.run('DELETE FROM movies WHERE _id = ?', [movieId], async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            db.all('SELECT * FROM movies', (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }

                // Render the 'deleteMovie' view with the updated movie list and success message
                res.render('deleteMovie', { movies: rows, successMessage: 'Movie deleted successfully!' });
            });

            // Remove the movie from users' mylist
            // db.run('UPDATE users SET mylist = REPLACE(mylist, ?, "")', [movieId], async (err) => {
            //     if (err) {
            //         console.error(err);
            //         return res.status(500).send('Internal Server Error');
            //     }

            //     // Remove the movie from users' watchedMovies
            //     db.run('UPDATE users SET watchedMovies = REPLACE(watchedMovies, ?, "")', [movieId], async (err) => {
            //         if (err) {
            //             console.error(err);
            //             return res.status(500).send('Internal Server Error');
            //         }

            //         // Query movies from the SQLite database after deletion
            //         db.all('SELECT * FROM movies', (err, rows) => {
            //             if (err) {
            //                 console.error(err);
            //                 return res.status(500).send('Internal Server Error');
            //             }

            //             // Render the 'deleteMovie' view with the updated movie list and success message
            //             res.render('deleteMovie', { movies: rows, successMessage: 'Movie deleted successfully!' });
            //         });
            //     });
            // });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
