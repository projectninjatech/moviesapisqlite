require('dotenv').config();
const express = require('express');
const router = express.Router()
const db = require('../db')

router.post('/fetch-movie', async (req, res) => {
    let search_term = req.body.searchTerm;

    try {
        const url = `https://api.themoviedb.org/3/search/movie?query=${search_term}&include_adult=false&language=en-US&page=1`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY
            }
        };

        const responseData = await fetch(url, options);
        const result = await responseData.json();
        console.log("Result", result);

        // Check if any results were found
        if (result.results.length === 0) {
            return res.status(404).json({ error: 'No movies found with the given search term' });
        }

        // Render the page with a list of movies and posters
        res.render('addMovieList', { movieList: result.results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

// Create a new route for handling movie selection
router.get('/addMovie/:movieId', async (req, res) => {
    const movieId = req.params.movieId;

    try {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY
            }
        };

        const movieData = await fetch(url, options);
        const movieDetails = await movieData.json();

        const watchProvidersUrl = `https://api.themoviedb.org/3/movie/${movieId}/watch/providers`;
        const watchProvidersResponse = await fetch(watchProvidersUrl, options);
        const watchProvidersResult = await watchProvidersResponse.json();

        const watchProviders = Object.keys(watchProvidersResult.results)
            .filter((country) => country === "IN") // Filter only the country with code "IN"
            .map((country) => {
                const countryData = watchProvidersResult.results[country];
                return {
                    country,
                    providerName: countryData.flatrate ? countryData.flatrate[0]?.provider_name : countryData.buy[0]?.provider_name,
                };
            });

        movieDetails.watchProviders = watchProviders;

        const genreIds = movieDetails.genres.map(genre => genre.id);
        const genreNames = movieDetails.genres.map(genre => genre.name);
        movieDetails.production_companies = movieDetails.production_companies.map(company => company.name);
        movieDetails.watchProviders = watchProviders.map(provider => provider.providerName);

        movieDetails.genreIds = genreIds;
        movieDetails.genres = genreNames;

        // console.log("Movie Details", movieDetails)

        // Render the addMovie page with the details of the selected movie
        res.render('addMovie', { movieDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});


function saveMovieDetails(movieDetails) {
    return new Promise((resolve, reject) => {
        const genreIds = movieDetails.genreIds.split(',').map(id => Number(id));
        const genreIdsString = genreIds.join(',');

        console.log("Genre IDs", genreIds)

        db.run(`INSERT INTO movies (
            movieID, backdropPath, budget, genreIds, genres, originalTitle, overview,
            ratings, popularity, posterPath, productionCompanies, releaseDate,
            revenue, runtime, status, title, watchProviders, logos, downloadLink
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            movieDetails.id,
            'https://image.tmdb.org/t/p/original' + movieDetails.backdrop_path,
            Number(movieDetails.budget),
            genreIdsString,
            movieDetails.genres,
            movieDetails.original_title,
            movieDetails.overview,
            Number(movieDetails.ratings),
            Number(movieDetails.popularity),
            'https://image.tmdb.org/t/p/original' + movieDetails.poster_path,
            movieDetails.production_companies,
            movieDetails.release_date,
            Number(movieDetails.revenue),
            Number(movieDetails.runtime),
            movieDetails.status,
            movieDetails.title,
            movieDetails.watchProviders,
            'https://image.tmdb.org/t/p/original' + movieDetails.logos,
            movieDetails.downloadLink
        ], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID); // Resolve with the ID of the inserted row
            }
        });
    });
}

// Route for adding movie details
router.post('/add-movie-details', async (req, res) => {
    try {
        const movieDetails = req.body;

        console.log("Movie Details", movieDetails);

        // Check if the movie already exists in the database
        const existingMovie = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM movies WHERE movieID = ?', [movieDetails.id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (existingMovie) {
            // Movie with the same movieID already exists, return a JSON response
            console.log(`Movie with movieID ${movieDetails.id} already exists. Skipping.`);
            return res.status(400).json({ error: `Movie with movieID ${movieDetails.id} already exists. Skipping.` });
        }

        // Insert movie details into the database
        await saveMovieDetails(movieDetails);

        res.render('addMovie', { successMessage: 'Movie details submitted successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit movie details' });
    }
});

module.exports = router;