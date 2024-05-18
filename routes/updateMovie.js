const express = require('express');
const router = express.Router();
const db = require('../db'); // Import your SQLite database connection

router.get('/edit-movie-list', async (req, res) => {
    try {
        const query = `SELECT * FROM movies`;
        db.all(query, (err, movies) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            console.log("Movie list are", movies);
            res.render('editMovieList', { movies });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/movies/:_id', async (req, res) => {
    try {
        const movieId = req.params._id;
        const query = `SELECT * FROM movies WHERE _id = ?`;
        db.get(query, [movieId], (err, movie) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (!movie) {
                return res.status(404).send('Movie not found');
            }
            console.log("Movie details update", movie);
            res.render('updateMovieDetails', { movie });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/update-movie/:_id', async (req, res) => {
    try {
        const ID = req.params._id;
        const updatedMovie = {
            movieID: Number(req.body.movieID),
            backdropPath: req.body.backdropPath,
            budget: Number(req.body.budget),
            genreIds: req.body.genreIds,
            genres: req.body.genres.split(','),
            originalTitle: req.body.originalTitle,
            overview: req.body.overview,
            ratings: Number(req.body.ratings),
            popularity: Number(req.body.popularity),
            posterPath: req.body.posterPath,
            productionCompanies: req.body.productionCompanies.split(','),
            releaseDate: req.body.releaseDate,
            revenue: Number(req.body.revenue),
            runtime: Number(req.body.runtime),
            status: req.body.status,
            title: req.body.title,
            watchProviders: [req.body.watchProviders],
            logos: 'https://image.tmdb.org/t/p/original' + req.body.logos,
            downloadLink: req.body.downloadLink,
        };

        const query = `
            UPDATE movies
            SET movieID = ?, backdropPath = ?, budget = ?, genreIds = ?, genres = ?, originalTitle = ?,
                overview = ?, ratings = ?, popularity = ?, posterPath = ?, productionCompanies = ?,
                releaseDate = ?, revenue = ?, runtime = ?, status = ?, title = ?, watchProviders = ?,
                logos = ?, downloadLink = ?
            WHERE _id = ?
        `;
        const values = [
            updatedMovie.movieID, updatedMovie.backdropPath, updatedMovie.budget,
            updatedMovie.genreIds, updatedMovie.genres.join(','), updatedMovie.originalTitle,
            updatedMovie.overview, updatedMovie.ratings, updatedMovie.popularity, updatedMovie.posterPath,
            updatedMovie.productionCompanies.join(','), updatedMovie.releaseDate, updatedMovie.revenue,
            updatedMovie.runtime, updatedMovie.status, updatedMovie.title, updatedMovie.watchProviders.join(','),
            updatedMovie.logos, updatedMovie.downloadLink, ID
        ];

        db.run(query, values, function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            if (this.changes === 0) {
                return res.status(404).send('Movie not found');
            }
            res.render('updateMovieDetails', {
                movie: updatedMovie,
                successMessage: 'Movie updated successfully!'
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;