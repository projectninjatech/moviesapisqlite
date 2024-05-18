require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function downloadPoster(posterURL, posterID) {
    try {
        // console.log("Poster ID", posterID)
        const response = await axios.get(posterURL, {
            responseType: 'stream'
        });

        const posterDirectory = `${process.env.HTTP_SERVER_MEDIA_DIR}/posters`;
        const posterPath = path.join(posterDirectory, `${posterID}.jpg`);
        response.data.pipe(fs.createWriteStream(posterPath));

        const newPosterUrl = `http://${process.env.SERVER_IP}:8080/posters/${posterID}.jpg`; // New URL
        return { newPosterUrl };
    } catch (error) {
        console.error('Error downloading poster:', error);
        return null;
    }
}


router.get('/download-movies-posters', async (req, res) => {
    try {
        // Fetch all movies posters
        const moviesPoster = await new Promise((resolve, reject) => {
            db.all('SELECT posterPath FROM movies', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Download movies posters
        for (const mv of moviesPoster) {
            const posterURL = mv.posterPath;
            const moviePosterID = posterURL.substring(posterURL.lastIndexOf('/') + 1, posterURL.lastIndexOf('.'));
            await downloadPoster(posterURL, moviePosterID);
        }

        const oldUrlPrefix = 'https://image.tmdb.org/t/p/original/';
        const newUrlPrefix = `http://${process.env.SERVER_IP}:8080/posters/`;

        // Update movies posters URL
        const updateEpisodesQuery = `
            UPDATE movies
            SET posterPath = REPLACE(posterPath, ?, ?)
            WHERE posterPath LIKE ?;
        `;
        db.run(updateEpisodesQuery, [oldUrlPrefix, newUrlPrefix, `${oldUrlPrefix}%`], function(err) {
            if (err) {
                return console.error('Error updating episode posters:', err.message);
            }
            console.log(`Episode posters updated: ${this.changes}`);
        });
        res.json({ success: true, message: 'Movie Posters downloaded and URLs updated successfully' });
    } catch (error) {
        console.error('Error downloading posters:', error);
        res.status(500).json({ success: false, error: 'Failed to download posters' });
    }
});

router.get('/download-shows-posters', async (req, res) => {
    try {
        // Fetch all episode posters
        const episodesPoster = await new Promise((resolve, reject) => {
            db.all('SELECT poster FROM episodes', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Fetch all TV show posters
        const showsPoster = await new Promise((resolve, reject) => {
            db.all('SELECT posterPath FROM tv_shows', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Download episode posters
        for (const ep of episodesPoster) {
            const posterURL = ep.poster;
            const episodePosterID = posterURL.substring(posterURL.lastIndexOf('/') + 1, posterURL.lastIndexOf('.'));
            await downloadPoster(posterURL, episodePosterID);
        }

        // Download TV show posters
        for (const show of showsPoster) {
            const posterURL = show.posterPath;
            const showPosterID = posterURL.substring(posterURL.lastIndexOf('/') + 1, posterURL.lastIndexOf('.'));
            await downloadPoster(posterURL, showPosterID);
        }

        const oldUrlPrefix = 'https://image.tmdb.org/t/p/original/';
        const newUrlPrefix = `http://${process.env.SERVER_IP}:8080/posters/`;

        // Update episode posters URL
        const updateEpisodesQuery = `
            UPDATE episodes
            SET poster = REPLACE(poster, ?, ?)
            WHERE poster LIKE ?;
        `;
        db.run(updateEpisodesQuery, [oldUrlPrefix, newUrlPrefix, `${oldUrlPrefix}%`], function(err) {
            if (err) {
                return console.error('Error updating episode posters:', err.message);
            }
            console.log(`Episode posters updated: ${this.changes}`);
        });

        // Update TV show posters URL
        const updateShowsQuery = `
            UPDATE tv_shows
            SET posterPath = REPLACE(posterPath, ?, ?)
            WHERE posterPath LIKE ?;
        `;
        db.run(updateShowsQuery, [oldUrlPrefix, newUrlPrefix, `${oldUrlPrefix}%`], function(err) {
            if (err) {
                return console.error('Error updating TV show posters:', err.message);
            }
            console.log(`TV show posters updated: ${this.changes}`);
        });

        res.json({ success: true, message: 'TV Show Posters downloaded and URLs updated successfully' });
    } catch (error) {
        console.error('Error downloading posters:', error);
        res.status(500).json({ success: false, error: 'Failed to download posters' });
    }
});



// Function to delete posters
async function deletePoster(posterID) {
    try {
        const posterDirectory = `${process.env.HTTP_SERVER_MEDIA_DIR}/posters`;
        const posterPath = path.join(posterDirectory, `${posterID}.jpg`);
        if (fs.existsSync(posterPath)) {
            fs.unlinkSync(posterPath);
        }
        return true;
    } catch (error) {
        console.error('Error deleting poster:', error);
        return false;
    }
}

// Endpoint to delete movie posters
router.get('/delete-movies-posters', async (req, res) => {
    try {
        // Fetch all movies posters
        const moviesPoster = await new Promise((resolve, reject) => {
            db.all('SELECT posterPath FROM movies', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Delete movies posters
        for (const mv of moviesPoster) {
            const posterURL = mv.posterPath;
            const moviePosterID = posterURL.substring(posterURL.lastIndexOf('/') + 1, posterURL.lastIndexOf('.'));
            await deletePoster(moviePosterID);
        }

        const oldUrlPrefix = `http://${process.env.SERVER_IP}:8080/posters/`;
        const newUrlPrefix = 'https://image.tmdb.org/t/p/original/';

        // Update movies posters URL
        const updateMoviesQuery = `
            UPDATE movies
            SET posterPath = REPLACE(posterPath, ?, ?)
            WHERE posterPath LIKE ?;
        `;
        db.run(updateMoviesQuery, [oldUrlPrefix, newUrlPrefix, `${oldUrlPrefix}%`], function(err) {
            if (err) {
                return console.error('Error updating movie posters:', err.message);
            }
            console.log(`Movie posters updated: ${this.changes}`);
        });
        res.json({ success: true, message: 'Movie Posters deleted and URLs updated successfully' });
    } catch (error) {
        console.error('Error deleting posters:', error);
        res.status(500).json({ success: false, error: 'Failed to delete posters' });
    }
});


// Endpoint to delete TV show and episode posters
router.get('/delete-shows-and-episodes-posters', async (req, res) => {
    try {
        // Fetch all TV show posters
        const showsPoster = await new Promise((resolve, reject) => {
            db.all('SELECT posterPath FROM tv_shows', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Fetch all episode posters
        const episodesPoster = await new Promise((resolve, reject) => {
            db.all('SELECT poster FROM episodes', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        // Delete TV show posters
        for (const show of showsPoster) {
            const posterURL = show.posterPath;
            const showPosterID = posterURL.substring(posterURL.lastIndexOf('/') + 1, posterURL.lastIndexOf('.'));
            await deletePoster(showPosterID);
        }

        // Delete episode posters
        for (const ep of episodesPoster) {
            const posterURL = ep.poster;
            const episodePosterID = posterURL.substring(posterURL.lastIndexOf('/') + 1, posterURL.lastIndexOf('.'));
            await deletePoster(episodePosterID);
        }

        const oldUrlPrefix = `http://${process.env.SERVER_IP}:8080/posters/`;
        const newUrlPrefix = 'https://image.tmdb.org/t/p/original/';

        // Update TV show posters URL
        const updateShowsQuery = `
            UPDATE tv_shows
            SET posterPath = REPLACE(posterPath, ?, ?)
            WHERE posterPath LIKE ?;
        `;
        db.run(updateShowsQuery, [oldUrlPrefix, newUrlPrefix, `${oldUrlPrefix}%`], function(err) {
            if (err) {
                return console.error('Error updating TV show posters:', err.message);
            }
            console.log(`TV show posters updated: ${this.changes}`);
        });

        // Update episode posters URL
        const updateEpisodesQuery = `
            UPDATE episodes
            SET poster = REPLACE(poster, ?, ?)
            WHERE poster LIKE ?;
        `;
        db.run(updateEpisodesQuery, [oldUrlPrefix, newUrlPrefix, `${oldUrlPrefix}%`], function(err) {
            if (err) {
                return console.error('Error updating episode posters:', err.message);
            }
            console.log(`Episode posters updated: ${this.changes}`);
        });

        res.json({ success: true, message: 'TV Show and Episode Posters deleted and URLs updated successfully' });
    } catch (error) {
        console.error('Error deleting posters:', error);
        res.status(500).json({ success: false, error: 'Failed to delete posters' });
    }
});


module.exports = router;