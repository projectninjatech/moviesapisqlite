const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../db');

// Function to download poster image
async function downloadPoster(posterUrl, movieId) {
    try {
        const response = await axios.get(posterUrl, {
            responseType: 'stream'
        });
        
        // const posterDirectory = "C:\\Users\\imran\\OneDrive\\Documents\\NodeJS Projects\\MoviesAPISQLite\\public\\posters";
        // const posterPath = path.join(posterDirectory, `${movieId}.jpg`);

        const posterPath = path.join(__dirname, '../public/posters', `${movieId}.jpg`); // Path to save the poster
        response.data.pipe(fs.createWriteStream(posterPath)); // Save the poster image

        const newPosterUrl = `http://192.168.0.205:8080/${movieId}.png`; // New URL
        return { posterPath, newPosterUrl };
    } catch (error) {
        console.error('Error downloading poster:', error);
        return null;
    }
}

// Endpoint to download all poster images
router.get('/download-posters', async (req, res) => {
    try {
        // Query database to get all movie details with poster URLs
        const movies = await new Promise((resolve, reject) => {
            db.all('SELECT movieID, posterPath FROM movies', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Download each poster image
        const updatedMovies = [];
        for (const movie of movies) {
            if (movie.posterPath) {
                const posterUrl = movie.posterPath;
                const movieId = movie.movieID;
                const { posterPath, newPosterUrl } = await downloadPoster(posterUrl, movieId);
                if (posterPath) {
                    // Update database with new URL
                    await new Promise((resolve, reject) => {
                        db.run('UPDATE movies SET posterPath = ? WHERE movieID = ?', [newPosterUrl, movieId], (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                    updatedMovies.push({ movieId, newPosterUrl });
                }
            }
        }

        res.json({ success: true, updatedMovies });
    } catch (error) {
        console.error('Error downloading posters:', error);
        res.status(500).json({ success: false, error: 'Failed to download posters' });
    }
});

module.exports = router;