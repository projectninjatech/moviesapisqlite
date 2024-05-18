const express = require('express');
const router = express.Router();
const isLoggedIn = require('../routes/isLoggedin')
const db = require('../db')

router.get('/getAllShows', async (req, res) => {
    try {
        // Query to select all shows
        const query = `SELECT * FROM tv_shows`;

        // Execute the query to fetch shows
        db.all(query, async (err, shows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to fetch shows' });
            }

            // Iterate over each show to fetch its seasons and episodes
            for (const show of shows) {
                show.genres = JSON.parse(show.genres);
                const seasonsQuery = `SELECT * FROM seasons WHERE show_id = ?`;
                const seasons = await new Promise((resolve, reject) => {
                    db.all(seasonsQuery, [show._id], (err, seasonRows) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(seasonRows);
                        }
                    });
                });



                // Iterate over each season to fetch its episodes
                for (const season of seasons) {

                    const episodesQuery = `SELECT * FROM episodes WHERE season_id = ?`;
                    const episodes = await new Promise((resolve, reject) => {
                        db.all(episodesQuery, [season._id], (err, episodeRows) => {
                            if (err) {
                                reject(err);
                            } else {
                                console.log("Episdodes are", episodeRows)
                                resolve(episodeRows);
                            }
                        });
                    });
                    // Add episodes to the season object
                    season.episodes = episodes;

                }

                // Add seasons to the show object
                show.seasons = seasons;
            }

            // Send the fetched shows with seasons and episodes as a response
            res.json(shows);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch shows' });
    }
});


router.get('/get-latest-watched-episodeID/:showID', isLoggedIn, async (req, res) => {
    try {
        const { showID } = req.params;
        const userId = req.session.user._id;

        // Retrieve the user's watched shows from the database
        const query = `
        SELECT * FROM watched_shows 
        WHERE user_id = ? AND show_id = ?
        ORDER BY uploadTime DESC
        LIMIT 1
      `;

        db.get(query, [userId, showID], (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (!row) {
                return res.json({ episodeID: null });
            }

            // Get the episodeID of the latest episode
            const latestEpisodeID = row;

            res.json({ episodeID: latestEpisodeID });
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/getAllGenres', async (req, res) => {
    try {

        // Query to select all genres from the database
        const query = `SELECT genres FROM tv_shows`;

        // Execute the query to fetch all genres
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to fetch genres' });
            }

            // Extract genres from the result rows
            const allGenres = rows.map((row) => JSON.parse(row.genres)).flat().map((genre) => genre.trim());

            // Get unique genres
            const uniqueGenres = [...new Set(allGenres)];

            // Send the unique genres as a response
            res.json(uniqueGenres);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});




// router.get('/getAllShowsByGenre', async (req, res) => {
//     try {
//         // Step 1: Fetch all distinct genres
//         const distinctGenresQuery = `SELECT genres FROM tv_shows`;

//         db.all(distinctGenresQuery, async (err, rows) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).json({ error: 'Failed to fetch distinct genres' });
//             }

//             // Extract genres from the result rows
//             const allGenres = rows.map((row) => JSON.parse(row.genres)).flat().map((genre) => genre.trim());

//             // Get unique genres
//             const uniqueGenres = [...new Set(allGenres)];

//             console.log("Distinct Genres", uniqueGenres)

//             // Step 2: For each genre, fetch shows along with seasons and episodes
//             const showsByGenre = [];

//             for (const genre of uniqueGenres) {

//                 const showsQuery = `
//                     SELECT tv_shows.*
//                     FROM tv_shows
//                     WHERE tv_shows.genres LIKE ?
//                 `;

//                 const shows = await new Promise((resolve, reject) => {
//                     db.all(showsQuery, [`%${genre}%`], (err, rows) => {
//                         if (err) {
//                             reject(err);
//                         } else {
//                             console.log("Show details", rows)
//                             const groupedShows = {};
//                             rows.forEach(row => {
//                                 if (!groupedShows[row._id]) {
//                                     groupedShows[row._id] = {
//                                         ...row,
//                                         seasons: []
//                                     };
//                                 }

//                                 if (row.season_number !== null) {
//                                     const seasonIndex = groupedShows[row._id].seasons.findIndex(season => season.season_number === row.season_number);

//                                     if (seasonIndex === -1) {
//                                         const season = {
//                                             season_number: row.season_number,
//                                             episodes: []
//                                         };
//                                         groupedShows[row._id].seasons.push(season);
//                                     }

//                                     if (row.episode_number !== null) {
//                                         const episode = {
//                                             episode_number: row.episode_number,
//                                             name: row.episode_name,
//                                             runtime: row.episode_runtime,
//                                             overview: row.episode_overview,
//                                             poster: row.episode_poster,
//                                             downloadLink: row.episode_download_link,
//                                             _id: row.episode_id
//                                         };

//                                         const season = groupedShows[row._id].seasons.find(season => season.season_number === row.season_number);
//                                         season.episodes.push(episode);
//                                     }
//                                 }
//                             });

//                             resolve(Object.values(groupedShows));
//                         }
//                     });
//                 });

//                 showsByGenre.push({ genre: genre, shows: shows });
//             }

//             res.json(showsByGenre);
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// });






router.get('/getAllShowsByGenre', async (req, res) => {
    try {
        // Step 1: Fetch all distinct genres
        const distinctGenresQuery = `SELECT genres FROM tv_shows`;

        db.all(distinctGenresQuery, async (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to fetch distinct genres' });
            }

            // Extract genres from the result rows
            const allGenres = rows.map((row) => JSON.parse(row.genres)).flat().map((genre) => genre.trim());

            // Get unique genres
            const uniqueGenres = [...new Set(allGenres)];

            console.log("Distinct Genres", uniqueGenres)

            // Step 2: For each genre, fetch shows along with seasons and episodes
            const showsByGenre = [];

            for (const genre of uniqueGenres) {
                const showsQuery = `
                    SELECT *
                    FROM tv_shows
                    WHERE genres LIKE ?
                `;

                const shows = await new Promise((resolve, reject) => {
                    db.all(showsQuery, [`%${genre}%`], async (err, rows) => {
                        if (err) {
                            reject(err);
                        } else {
                            const processedShows = [];
                            for (const row of rows) {
                                const show = {
                                    _id: row._id,
                                    name: row.name,
                                    overview: row.overview,
                                    genres: JSON.parse(row.genres),
                                    posterPath: row.posterPath,
                                    releaseDate: row.releaseDate,
                                    ratings: row.ratings,
                                    seasons: []
                                };

                                const seasonsQuery = `SELECT * FROM seasons WHERE show_id = ?`;
                                const seasons = await new Promise((resolve, reject) => {
                                    db.all(seasonsQuery, [row._id], async (err, seasonRows) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            for (const seasonRow of seasonRows) {
                                                const season = {
                                                    season_number: seasonRow.season_number,
                                                    episodes: []
                                                };
                                                const episodesQuery = `SELECT * FROM episodes WHERE season_id = ?`;
                                                const episodes = await new Promise((resolve, reject) => {
                                                    db.all(episodesQuery, [seasonRow._id], (err, episodeRows) => {
                                                        if (err) {
                                                            reject(err);
                                                        } else {
                                                            season.episodes = episodeRows.map(episodeRow => ({
                                                                episode_number: episodeRow.episode_number,
                                                                name: episodeRow.name,
                                                                runtime: episodeRow.runtime,
                                                                overview: episodeRow.overview,
                                                                poster: episodeRow.poster,
                                                                downloadLink: episodeRow.downloadLink,
                                                                _id: episodeRow._id
                                                            }));
                                                            resolve(season);
                                                        }
                                                    });
                                                });
                                                show.seasons.push(season);
                                            }
                                            resolve(show);
                                        }
                                    });
                                });
                                processedShows.push(seasons);
                            }
                            resolve(processedShows);
                        }
                    });
                });

                showsByGenre.push({ genre, shows });
            }

            res.json(showsByGenre);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});





module.exports = router;