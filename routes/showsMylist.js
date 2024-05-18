const express = require('express');
const router = express.Router();
const isLoggedIn = require('../routes/isLoggedin')
const db = require('../db')

router.post('/add-show-to-mylist/:showID', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id; // Assuming the user ID is stored in req.user._id
        const showID = req.params.showID;

        const insertQuery = `
            INSERT INTO user_shows_mylist (user_id, show_id)
            VALUES (?, ?)
        `;

        db.run(insertQuery, [userId, showID], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: err.message });
            }

            // Fetch user details along with their mylist
            db.get(`SELECT users.*, GROUP_CONCAT(show_id) AS showsMylist 
                    FROM users 
                    LEFT JOIN user_shows_mylist ON users._id = user_shows_mylist.user_id 
                    WHERE users._id = ? 
                    GROUP BY users._id`, [userId], function(err, row) {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }

                // Parse the mylist JSON array
                // const mylist = row.mylist ? row.mylist.split(',') : [];
                const showsMylist = row.showsMylist ? row.showsMylist.split(',').map(Number) : [];

                // Return user details including updated mylist as an array
                res.json({ success: true, user: { ...row, showsMylist } });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});


router.post('/remove-show-from-mylist/:showID', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id; // Assuming user ID is stored in the 'id' property of the user object
        const showID = req.params.showID; // Extract movie ID from request parameters

        // Remove the movie association from the user_movies_mylist table
        db.run(`DELETE FROM user_shows_mylist WHERE user_id = ? AND show_id = ?`, [userId, showID], async function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            // Fetch user details along with their mylist
            db.get(`SELECT users.*, GROUP_CONCAT(show_id) AS showsMylist 
                    FROM users 
                    LEFT JOIN user_shows_mylist ON users._id = user_shows_mylist.user_id 
                    WHERE users._id = ? 
                    GROUP BY users._id`, [userId], function(err, row) {
                if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                }

                // Parse the mylist JSON array
                const showsMylist = row.showsMylist ? row.showsMylist.split(',').map(Number) : [];

                // Return user details including updated mylist as an array
                res.json({ success: true, user: { ...row, showsMylist } });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/showsMylist', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id; // Assuming the user ID is stored in req.user._id
        
        // Query to retrieve shows in the user's mylist
        const query = `
            SELECT tv_shows.*, 
                   seasons.season_number,
                   episodes.episode_number,
                   episodes.name AS episode_name,
                   episodes.runtime AS episode_runtime,
                   episodes.overview AS episode_overview,
                   episodes.poster AS episode_poster,
                   episodes.downloadLink AS episode_download_link,
                   episodes._id AS episode_id
            FROM user_shows_mylist
            INNER JOIN tv_shows ON user_shows_mylist.show_id = tv_shows._id
            LEFT JOIN seasons ON tv_shows._id = seasons.show_id
            LEFT JOIN episodes ON seasons._id = episodes.season_id
            WHERE user_shows_mylist.user_id = ?
            ORDER BY tv_shows._id, seasons.season_number, episodes.episode_number;
        `;

        // Execute the query
        db.all(query, [userId], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: err.message });
            }

            // Process the rows to organize data into shows with seasons and episodes
            const showsInMyList = [];
            let currentShow = null;
            let currentSeason = null;
            rows.forEach(row => {
                if (!currentShow || currentShow._id !== row._id) {
                    // New show encountered
                    currentShow = {
                        _id: row._id,
                        name: row.name,
                        overview: row.overview,
                        genres: JSON.parse(row.genres),
                        posterPath: row.posterPath,
                        releaseDate: row.releaseDate,
                        ratings: row.ratings,
                        seasons: []
                    };
                    showsInMyList.push(currentShow);
                    currentSeason = null;
                }
                if (!currentSeason || currentSeason.season_number !== row.season_number) {
                    // New season encountered
                    currentSeason = {
                        season_number: row.season_number,
                        episodes: []
                    };
                    currentShow.seasons.push(currentSeason);
                }
                if (row.episode_number !== null) {
                    // Episode details
                    currentSeason.episodes.push({
                        episode_number: row.episode_number,
                        name: row.episode_name,
                        runtime: row.episode_runtime,
                        overview: row.episode_overview,
                        poster: row.episode_poster,
                        downloadLink: row.episode_download_link,
                        _id: row.episode_id
                    });
                }
            });

            res.json({ success: true, showsInMyList });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;