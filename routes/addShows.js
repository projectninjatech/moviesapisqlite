const express = require('express');
const router = express.Router()
const db = require('../db')

router.post('/fetch-shows', async (req, res) => {
    let search_term = req.body.searchTerm;
    console.log("Search Term is", search_term);

    try {
        const url = `https://api.themoviedb.org/3/search/tv?query=${search_term}&include_adult=false&language=en-US&page=1`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY
            }
        };

        const responseData = await fetch(url, options);
        const result = await responseData.json();

        // Check if any results were found
        if (result.results.length === 0) {
            return res.status(404).json({ error: 'No TV Shows found with the given search term' });
        }

        // Send the list of TV shows as JSON data
        res.render('addShowsList', { showsList: result.results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch TV Show details' });
    }
});


router.get('/addShows/:showID', async (req, res) => {
    const showID = req.params.showID;

    try {
        const url = `https://api.themoviedb.org/3/tv/${showID}?language=en-US`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY
            }
        };

        const showsData = await fetch(url, options);
        const showsDetails = await showsData.json();

        const genreIds = showsDetails.genres.map(genre => genre.id);
        const genreNames = showsDetails.genres.map(genre => genre.name);
        showsDetails.production_companies = showsDetails.production_companies.map(company => company.name);

        showsDetails.genreIds = genreIds;
        showsDetails.genres = genreNames;

        const numOfSeasons = showsDetails.number_of_seasons;
        console.log("Number of seasons", numOfSeasons);

        showsDetails.seasons = [];

        for (let i = 1; i <= numOfSeasons; i++) {
            const seasonUrl = `https://api.themoviedb.org/3/tv/${showID}/season/${i}?language=en-US`;
            const response = await fetch(seasonUrl, options);
            const seasonData = await response.json();

            const episodes = seasonData.episodes.map(episode => ({
                episode_number: episode.episode_number,
                name: episode.name,
                runtime: episode.runtime,
                overview: episode.overview,
                poster: "https://image.tmdb.org/t/p/original" + episode.still_path,
                downloadLink: ""
            }));

            showsDetails.seasons.push({
                season_number: seasonData.season_number,
                episodes: episodes
            });
        }

        const selectedShowDetails = {
            first_air_date: showsDetails.first_air_date,
            genres: showsDetails.genres,
            id: showsDetails.id,
            name: showsDetails.name,
            overview: showsDetails.overview,
            poster_path: "https://image.tmdb.org/t/p/original" + showsDetails.poster_path,
            vote_average: showsDetails.vote_average,
            seasons: showsDetails.seasons
        };

        // res.json(selectedShowDetails); // Change to JSON response
        res.render('addShows', { showsDetails: selectedShowDetails })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch TV Shows details' });
    }
});



// router.post('/add-show-details', async (req, res) => {
//     try {
//         const showsDetailsData = req.body;
//         console.log("Shows body", showsDetailsData);

//         // Access showDetails from showsDetailsData
//         const showDetails = showsDetailsData.showDetails;

//         // Convert genres to an array
//         const genresArray = showDetails.genres.split(',').map(genre => genre.trim());

//         // Insert the TV show details into the SQLite database
//         const insertQuery = `
//             INSERT INTO tv_shows (
//                 name, overview, genres, posterPath, releaseDate, ratings
//             ) VALUES (?, ?, ?, ?, ?, ?)
//         `;
//         const insertParams = [
//             showDetails.name,
//             showDetails.overview,
//             JSON.stringify(genresArray),
//             showDetails.poster_path,
//             new Date(showDetails.first_air_date),
//             Number(showDetails.vote_average)
//         ];

//         const result = await new Promise((resolve, reject) => {
//             db.run(insertQuery, insertParams, function (err) {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     resolve({ lastID: this.lastID });
//                 }
//             });
//         });

//         const showID = result.lastID;

//         // Insert seasons and episodes into the SQLite database
//         for (const season of req.body.seasons) {
//             const seasonInsertQuery = `
//                 INSERT INTO seasons (
//                     show_id, season_number
//                 ) VALUES (?, ?)
//             `;
//             const seasonInsertParams = [showID, Number(season.season_number)];

//             await new Promise((resolve, reject) => {
//                 db.run(seasonInsertQuery, seasonInsertParams, function (err) {
//                     if (err) {
//                         reject(err);
//                     } else {
//                         resolve();
//                     }
//                 });
//             });

//             const seasonID = this.lastID;

//             for (const episode of season.episodes) {
//                 const episodeInsertQuery = `
//                     INSERT INTO episodes (
//                         season_id, episode_number, name, runtime, overview, poster, downloadLink
//                     ) VALUES (?, ?, ?, ?, ?, ?, ?)
//                 `;
//                 const episodeInsertParams = [
//                     seasonID,
//                     Number(episode.episode_number),
//                     episode.name,
//                     Number(episode.runtime),
//                     episode.overview,
//                     episode.poster,
//                     episode.downloadLink
//                 ];

//                 await new Promise((resolve, reject) => {
//                     db.run(episodeInsertQuery, episodeInsertParams, function (err) {
//                         if (err) {
//                             reject(err);
//                         } else {
//                             resolve();
//                         }
//                     });
//                 });
//             }
//         }

//         res.status(201).json({ showID });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Failed to submit TV show details' });
//     }
// });


router.post('/add-show-details', async (req, res) => {
    try {
        const showsDetailsData = req.body;
        console.log("Shows body", showsDetailsData);

        // Access showDetails from showsDetailsData
        const showDetails = showsDetailsData.showDetails;

        // Convert genres to an array
        const genresArray = showDetails.genres.split(',').map(genre => genre.trim());

        // Insert the TV show details into the SQLite database
        const insertQuery = `
            INSERT INTO tv_shows (
                name, overview, genres, posterPath, releaseDate, ratings
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        const insertParams = [
            showDetails.name,
            showDetails.overview,
            JSON.stringify(genresArray),
            showDetails.poster_path,
            new Date(showDetails.first_air_date),
            Number(showDetails.vote_average)
        ];

        const result = await new Promise((resolve, reject) => {
            db.run(insertQuery, insertParams, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID });
                }
            });
        });

        const showID = result.lastID;

        // Insert seasons and episodes into the SQLite database
        for (const season of req.body.seasons) {
            const seasonInsertQuery = `
                INSERT INTO seasons (
                    show_id, season_number
                ) VALUES (?, ?)
            `;
            const seasonInsertParams = [showID, Number(season.season_number)];

            await new Promise((resolve, reject) => {
                db.run(seasonInsertQuery, seasonInsertParams, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        const seasonID = this.lastID; // Retrieve the last inserted season ID
                        resolve(seasonID);
                    }
                });
            }).then(async (seasonID) => {
                // Insert episodes for this season
                for (const episode of season.episodes) {
                    const episodeInsertQuery = `
                        INSERT INTO episodes (
                            season_id, episode_number, name, runtime, overview, poster, downloadLink
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;
                    const episodeInsertParams = [
                        seasonID,
                        Number(episode.episode_number),
                        episode.name,
                        Number(episode.runtime),
                        episode.overview,
                        episode.poster,
                        episode.downloadLink
                    ];

                    await new Promise((resolve, reject) => {
                        db.run(episodeInsertQuery, episodeInsertParams, function (err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                }
            });
        }

        res.status(201).json({ showID });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit TV show details' });
    }
});




// router.get('/shows', async (req, res) => {
//     try {
//         // Query to select all shows
//         const query = `SELECT * FROM tv_shows`;

//         // Execute the query to fetch shows
//         db.all(query, async (err, rows) => {
//             if (err) {
//                 console.error(err);
//                 return res.status(500).json({ error: 'Failed to fetch shows' });
//             }

//             // Iterate over each show to fetch its seasons and episodes
//             for (const show of rows) {
//                 const seasonsQuery = `SELECT * FROM seasons WHERE show_id = ?`;
//                 const seasons = await new Promise((resolve, reject) => {
//                     db.all(seasonsQuery, [show._id], (err, seasonRows) => {
//                         if (err) {
//                             reject(err);
//                         } else {
//                             resolve(seasonRows);
//                         }
//                     });
//                 });

//                 // Iterate over each season to fetch its episodes
//                 for (const season of seasons) {
//                     const episodesQuery = `SELECT * FROM episodes WHERE season_id = ?`;
//                     const episodes = await new Promise((resolve, reject) => {
//                         db.all(episodesQuery, [season._id], (err, episodeRows) => {
//                             if (err) {
//                                 reject(err);
//                             } else {
//                                 resolve(episodeRows);
//                             }
//                         });
//                     });

//                     // Add episodes to the season object
//                     season.episodes = episodes;
//                 }

//                 // Add seasons to the show object
//                 show.seasons = seasons;
//             }

//             // Send the fetched shows with seasons and episodes as a response
//             res.json({ shows: rows });
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Failed to fetch shows' });
//     }
// });








router.get('/episodes', async (req, res) => {
    try {
        // Query to select all episodes
        const query = `SELECT * FROM episodes`;

        // Execute the query to fetch all episodes
        db.all(query, (err, episodes) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to fetch episodes' });
            }

            // Send the fetched episodes as a response
            res.json({ episodes });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch episodes' });
    }
});


module.exports = router;