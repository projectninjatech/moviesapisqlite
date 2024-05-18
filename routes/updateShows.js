const express = require('express');
const router = express.Router();
const db = require('../db')


// Function to format release date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    // Options for formatting the date, adjust as needed
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    // Convert the date to a string in the desired format
    return date.toLocaleDateString('en-US', options);
}

router.get('/edit-shows-list', (req, res) => {
    try {
        // Query to select all shows
        const query = `SELECT * FROM tv_shows`;

        // Execute the query to fetch shows
        db.all(query, (err, shows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            // Format release dates
            shows.forEach(show => {
                show.releaseDate = formatDate(show.releaseDate);
            });

            console.log("TV Shows list are", shows);
            res.render('editShowList', { shows });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/shows/:id', async (req, res) => {
    try {
        const showID = req.params.id;

        // Query to fetch TV show details along with seasons and episodes
        const query = `
            SELECT 
                tv_shows._id AS show_id,
                tv_shows.name AS show_name,
                tv_shows.overview AS show_overview,
                tv_shows.genres AS show_genres,
                tv_shows.posterPath AS show_posterPath,
                tv_shows.releaseDate AS show_releaseDate,
                tv_shows.ratings AS show_ratings,
                seasons._id AS season_id,
                seasons.season_number,
                episodes._id AS episode_id,
                episodes.episode_number,
                episodes.name AS episode_name,
                episodes.runtime,
                episodes.overview AS episode_overview,
                episodes.poster,
                episodes.downloadLink
            FROM tv_shows
            LEFT JOIN seasons ON tv_shows._id = seasons.show_id
            LEFT JOIN episodes ON seasons._id = episodes.season_id
            WHERE tv_shows._id = ?
        `;
        
        // Execute the query
        db.all(query, [showID], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to fetch TV show details' });
            }

            // Aggregate the fetched data into the showDetails object
            const showDetails = {
                _id: rows[0].show_id,
                name: rows[0].show_name,
                overview: rows[0].show_overview,
                genres: JSON.parse(rows[0].show_genres),
                posterPath: rows[0].show_posterPath,
                releaseDate: rows[0].show_releaseDate,
                ratings: rows[0].show_ratings,
                seasons: []
            };

            // Iterate over the rows to group episodes by season
            let currentSeason = null;
            rows.forEach(row => {
                if (!currentSeason || currentSeason.season_number !== row.season_number) {
                    currentSeason = {
                        _id: row.season_id,
                        season_number: row.season_number,
                        episodes: []
                    };
                    showDetails.seasons.push(currentSeason);
                }

                // Add episode details to the current season
                currentSeason.episodes.push({
                    _id: row.episode_id,
                    episode_number: row.episode_number,
                    name: row.episode_name,
                    runtime: row.runtime,
                    overview: row.episode_overview,
                    poster: row.poster,
                    downloadLink: row.downloadLink
                });
            });

            res.render('updateShowsDetail', { showsDetails: showDetails });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch TV show details' });
    }
});


router.post('/update-show/:id', async (req, res) => {
    try {
        const existingShowQuery = `
            SELECT *
            FROM tv_shows
            WHERE _id = ?
        `;

        // Execute query to find the existing show
        db.get(existingShowQuery, [req.params.id], async (err, existingShow) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            // If the show does not exist, return 404
            if (!existingShow) {
                return res.status(404).send('Show not found');
            }

            // Update seasons and episodes
            const updateSeasonsAndEpisodes = async () => {
                for (const season of req.body.seasons) {
                    // Update episode details
                    for (const episode of season.episodes) {
                        const updateEpisodeQuery = `
                            UPDATE episodes
                            SET downloadLink = ?
                            WHERE season_id IN (
                                SELECT _id
                                FROM seasons
                                WHERE show_id = ? AND season_number = ?
                            ) AND episode_number = ?
                        `;
                        await new Promise((resolve, reject) => {
                            db.run(updateEpisodeQuery, [
                                episode.downloadLink,
                                req.params.id,
                                season.season_number,
                                episode.episode_number
                            ], function (err) {
                                if (err) {
                                    console.error(err);
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        });
                    }
                }
            };

            // Execute the function to update seasons and episodes
            await updateSeasonsAndEpisodes();

            // Update successful, render success message
            res.render('updateMovieDetails', {
                movie: req.body.showDetails,
                successMessage: 'Download links updated successfully!'
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;