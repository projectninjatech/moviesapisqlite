const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db')

// Registration route
router.post('/register', async (req, res) => {
    console.log("Register route")
    try {
        const { username, password, isAdmin } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(`INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)`, [username, hashedPassword, isAdmin ? 1 : 0], function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            res.json({ success: true, user: { id: this.lastID, username, isAdmin } });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Login route
// router.post('/login', async (req, res) => {
//     const { username, password } = req.body;

//     try {
//         // Retrieve user from the database based on the username
//         const user = await getUserByUsername(username);

//         // Check if the user exists
//         if (!user) {
//             return res.status(401).json({ success: false, message: 'Authentication failed' });
//         }

//         // Compare the provided password with the hashed password stored in the database
//         const passwordMatch = await bcrypt.compare(password, user.password);

//         if (passwordMatch) {
//             // Passwords match, so authentication is successful
//             req.session.user = user; // Store user information in the session
//             return res.json({ success: true, user: user });
//         } else {
//             // Passwords don't match, so authentication fails
//             return res.status(401).json({ success: false, message: 'Authentication failed' });
//         }
//     } catch (error) {
//         return res.status(500).json({ success: false, error: error.message });
//     }
// });







router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Retrieve user from the database based on the username
        const user = await getUserByUsername(username);

        // Check if the user exists
        if (!user) {
            return res.status(401).json({ success: false, message: 'Authentication failed' });
        }

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            // Passwords match, so authentication is successful
            // Retrieve user's mylist and watchedMovies
            const mylist = await new Promise((resolve, reject) => {
                db.all(`SELECT movie_id FROM user_movies_mylist WHERE user_id = ?`, [user._id], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const movieIds = rows.map(row => row.movie_id);
                        // const movieIds = rows.map(row => row.movie_id.toString());
                        resolve(movieIds);
                    }
                });
            });

            const watchedMovies = await new Promise((resolve, reject) => {
                db.all(`SELECT movie_id, watchedTime, uploadTime FROM user_watchedmovie_list WHERE user_id = ?`, [user._id], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            // Combine the user details, mylist, and watchedMovies into a single response
            const userDetails = {
                _id: user._id,
                username: user.username,
                isAdmin: user.isAdmin,
                mylist: mylist,
                watchedMovies: watchedMovies
            };

            console.log("User details", userDetails)
            req.session.user = userDetails; // Store user information in the session
            console.log("User details",req.session.user)
            return res.json({ success: true, user: userDetails });
        } else {
            // Passwords don't match, so authentication fails
            return res.status(401).json({ success: false, message: 'Authentication failed' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/check-auth', (req, res) => {
    if (req.session.user) {
        const userId = req.session.user._id;

        // Query the user_movies_mylist table to fetch the user's mylist
        db.get(`SELECT GROUP_CONCAT(movie_id) AS mylist FROM user_movies_mylist WHERE user_id = ?`, [userId], function(err, row) {
            if (err) {
                return res.status(500).json({ authenticated: false, error: err.message });
            }

            console.log("Mylis data",row)
            // Parse the mylist data
            // const mylist = row ? row.mylist.split(',').map(Number) : [];
            const mylist = [];
            if (row.mylist != null) {
                row.mylist.split(',').map(Number)
            }

            // If a user is stored in the session, they are authenticated
            res.json({ authenticated: true, user: { ...req.session.user, mylist } });
        });
    } else {
        // If no user is stored in the session, they are not authenticated
        res.json({ authenticated: false, user: null });
    }
});



router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

router.get('/admin/register', (req, res) => {
    res.render('adminRegister'); // Assuming 'adminRegister.hbs' exists in the 'views' folder
});

router.post('/admin/register', async (req, res) => {
    try {
        // Check if the secret code is valid
        const secretCode = req.body.secretCode;
        if (secretCode !== 'abcd1234') {
            return res.render('adminRegister', { errorMessage: 'Invalid secret code' });
        }

        // Validate other inputs and register the admin
        const isAdmin = true;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        db.run(`INSERT INTO users (username, password, isAdmin) VALUES (?, ?, ?)`, [req.body.username, hashedPassword, isAdmin ? 1 : 0], function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.redirect('/admin/login');
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/admin/login', (req, res) => {
    res.render('adminLogin'); // Assuming 'adminLogin.hbs' exists in the 'views' folder
});


router.post('/admin/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // Check if the username and password match an admin user in the database
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        if (!row) {
            // User with the provided username does not exist
            return res.render('adminLogin', { errorMessage: 'Authentication failed' });
        }

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, row.password);

        if (!passwordMatch) {
            // Passwords don't match, so authentication fails
            return res.render('adminLogin', { errorMessage: 'Authentication failed' });
        }

        // Check if the user is an admin
        if (!row.isAdmin) {
            // User is not an admin
            return res.render('adminLogin', { errorMessage: 'You are not an admin' });
        }

        // Set the user as authenticated in the session
        req.session.user = row;
        res.redirect('/');
    });
});


router.get('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.redirect('/admin/login');
    });
});



module.exports = router;
