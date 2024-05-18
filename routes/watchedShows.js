const express = require('express');
const router = express.Router();
const isLoggedIn = require('../routes/isLoggedin')
const db = require('../db')


router.post('/update-shows-watched-time/:episodeID', isLoggedIn, async (req, res) => {
    try {
        // const user = req.user;
        const userId = req.session.user._id;
        const episodeID = req.params.episodeID;
        const watchedTime = req.body.watchedTime;
        const episodeShowID = req.body.showID;
        console.log(`User: ${userId} | EpisodeID: ${episodeID} | WatchedTime: ${watchedTime} | ShowID: ${episodeShowID}`)

        // Check if the user has watched the episode
        const query = `
            SELECT *
            FROM watched_shows
            WHERE user_id = ? AND episode_id = ?
        `;
        db.get(query, [userId, episodeID], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            console.log("Episode found on user db", row)
            if (row) {
                // Update the watched time
                const updateQuery = `
                    UPDATE watched_shows
                    SET watchedTime = ?, uploadTime = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND episode_id = ?
                `;
                db.run(updateQuery, [watchedTime, userId, episodeID], async (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    res.json({ success: true });
                });
            } else {
                // Insert a new record
                const insertQuery = `
                    INSERT INTO watched_shows (user_id, episode_id, show_id, watchedTime, uploadTime)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                `;
                db.run(insertQuery, [userId, episodeID, episodeShowID, watchedTime], async (err) => {
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


router.delete('/remove-watched-show/:episodeID', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const episodeID = req.params.episodeID;

        // Check if the episode exists in the watched_shows table
        const query = `
            SELECT *
            FROM watched_shows
            WHERE user_id = ? AND episode_id = ?
        `;
        db.get(query, [userId, episodeID], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (row) {
                // Delete the record from the watched_shows table
                const deleteQuery = `
                    DELETE FROM watched_shows
                    WHERE user_id = ? AND episode_id = ?
                `;
                db.run(deleteQuery, [userId, episodeID], async (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    res.json({ success: true });
                });
            } else {
                // Episode not found in watched_shows table
                res.status(404).json({ success: false, message: 'Episode not found in watchedShows' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/get-show-watchtime/:episodeID', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id;
        const episodeID = req.params.episodeID;

        // Query to find the episode in the watched_shows table
        const query = `
            SELECT watchedTime
            FROM watched_shows
            WHERE user_id = ? AND episode_id = ?
        `;
        db.get(query, [userId, episodeID], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (row) {
                // Episode found in watched_shows table, return the watched time
                res.json({ success: true, watchedTime: row.watchedTime });
            } else {
                // Episode not found in watched_shows table
                res.status(404).json({ success: false, message: 'Episode not found in watchedShows' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/all-watched-shows', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user._id;

        // Query to fetch all watched shows with their details
        const query = `
            SELECT 
                ws._id, 
                ws.episode_id, 
                ws.watchedTime, 
                ws.uploadTime,
                e.name AS episodeName,
                e.runtime AS episodeRuntime,
                e.downloadLink AS episodeLink,
                e.episode_number AS episodeNumber,
                e.poster AS episodePoster,
                s.season_number AS seasonNumber,
                t._id AS showId,
                t.name AS showName,
                t.posterPath AS showPoster
            FROM 
                watched_shows ws
            INNER JOIN 
                episodes e ON ws.episode_id = e._id
            INNER JOIN 
                seasons s ON e.season_id = s._id
            INNER JOIN 
                tv_shows t ON s.show_id = t._id
            WHERE 
                ws.user_id = ?
        `;
        
        db.all(query, [userId], (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            const watchedShows = rows.map(row => ({
                id: row._id,
                episodeInfo: {
                    showId: row.showId,
                    episodeID: row.episode_id,
                    showName: row.showName,
                    seasonNumber: row.seasonNumber,
                    showPoster: row.showPoster,
                    episodeNumber: row.episodeNumber,
                    episodePoster: row.episodePoster,
                    episodeRuntime: row.episodeRuntime,
                    episodeLink: row.episodeLink,
                    episodeName: row.episodeName
                },
                watchedTime: row.watchedTime,
                uploadTime: row.uploadTime
            }));

            // Sort the watchedShows based on the uploadTime in descending order
            watchedShows.sort((a, b) => b.uploadTime - a.uploadTime);

            res.json({ success: true, watchedShows });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



// router.get('/episode-info/:episodeId', async (req, res) => {
//     try {
//         const episodeId = req.params.episodeId;

//         // Query to fetch the season array for the episode
//         const query = `
//             SELECT 
//                 e.*,
//                 s.show_id AS showID
//             FROM 
//                 episodes e
//             INNER JOIN 
//                 seasons s ON e.season_id = s._id
//             WHERE 
//                 e._id = ?
//         `;

//         db.get(query, [episodeId], async (err, row) => {
//             if (err) {
//                 return res.status(500).json({ success: false, error: err.message });
//             }

//             if (row) {
//                 const showID = row.showID;
//                 const seasonArrayQuery = `
//                     SELECT 
//                         e.*
//                     FROM 
//                         episodes e
//                     INNER JOIN 
//                         seasons s ON e.season_id = s._id
//                     WHERE 
//                         s.show_id = ?;
//                 `;
                
//                 db.all(seasonArrayQuery, [showID], (err, rows) => {
//                     if (err) {
//                         return res.status(500).json({ success: false, error: err.message });
//                     }

//                     res.json({ success: true, showID, seasonArray: rows });
//                 });
//             } else {
//                 res.status(404).json({ success: false, message: 'Episode not found' });
//             }
//         });
//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// });




router.get('/episode-info/:episodeId', async (req, res) => {
    try {
        const episodeId = req.params.episodeId;

        // Query to fetch the season array for the episode
        const query = `
            SELECT 
                e.*,
                s.show_id AS showID,
                s._id AS seasonID
            FROM 
                episodes e
            INNER JOIN 
                seasons s ON e.season_id = s._id
            WHERE 
                e._id = ?
        `;

        db.get(query, [episodeId], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (row) {
                const showID = row.showID;
                const seasonID = row.seasonID;
                const seasonArrayQuery = `
                    SELECT 
                        e.*
                    FROM 
                        episodes e
                    WHERE 
                        e.season_id = ?;
                `;
                
                db.all(seasonArrayQuery, [seasonID], (err, rows) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }

                    res.json({ success: true, showID, seasonArray: rows });
                });
            } else {
                res.status(404).json({ success: false, message: 'Episode not found' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;