const express = require('express');
const router = express.Router();
const db = require('../db');

// Function to format release date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    // Options for formatting the date, adjust as needed
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    // Convert the date to a string in the desired format
    return date.toLocaleDateString('en-US', options);
}

router.get('/delete-show', (req, res) => {
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
            console.log("Shows are",shows)
            res.render('deleteShow', { shows });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/delete-show/:id', async (req, res) => {
    const showId = req.params.id;

    try {
        db.serialize(() => {
            // Begin transaction
            db.run("BEGIN TRANSACTION");

            // Delete from related tables first to avoid foreign key constraint issues
            db.run(`DELETE FROM episodes WHERE season_id IN (SELECT _id FROM seasons WHERE show_id = ?)`, [showId]);
            db.run(`DELETE FROM seasons WHERE show_id = ?`, [showId]);
            db.run(`DELETE FROM user_shows_mylist WHERE show_id = ?`, [showId]);
            db.run(`DELETE FROM watched_shows WHERE show_id = ?`, [showId]);

            // Finally, delete the show
            db.run(`DELETE FROM tv_shows WHERE _id = ?`, [showId], function(err) {
                if (err) {
                    // Rollback transaction if any error occurs
                    db.run("ROLLBACK");
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }

                // Commit transaction
                db.run("COMMIT", (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Internal Server Error');
                    }

                    // Fetch the remaining shows to render the page
                    db.all(`SELECT * FROM tv_shows`, (err, shows) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Internal Server Error');
                        }

                        console.log("Delete Shows", shows);
                        res.render('deleteShow', { shows, successMessage: 'Show deleted successfully!' });
                    });
                });
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;