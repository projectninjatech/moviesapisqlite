require('dotenv').config()
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.set('view engine', 'hbs');
const port = process.env.PORT || 3000;

// Set up SQLite database connection
const db = new sqlite3.Database('pntflix.sqlite');

// Set up session management with Express
app.use(session({
    secret: 'abcd1234', // Secret key used to sign the session ID cookie
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
    store: new SQLiteStore({ db: 'pntflix.sqlite' }), // Store sessions in SQLite
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week (adjust as needed)
    },
}));

// Middleware to parse incoming requests with JSON payload
app.use(bodyParser.json()); // Parse JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies with extended mode

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Set up routes
const authRoutes = require('./routes/authRoutes');
const dashboard = require('./routes/dashboard');
const addMovie = require('./routes/addMovie')
const updateMovie = require('./routes/updateMovie')
const deleteMovie = require('./routes/deleteMovie')
const moviesMylist = require('./routes/moviesMylist')
const watchedMovies = require('./routes/watchedMovie')
const getMovies = require('./routes/getMovie')
const posterDownload = require('./routes/posterDownload')

const addShows = require('./routes/addShows')
const updateShows = require('./routes/updateShows')
const watchedShows = require('./routes/watchedShows')
const getShows = require('./routes/getShows')
const showsMylist = require('./routes/showsMylist')
const deleteShows = require('./routes/deleteShow')
const checkcon = require('./routes/checkcon')

app.use('/', authRoutes);
app.use('/', dashboard);
app.use('/', addMovie)
app.use('/', updateMovie)
app.use('/', deleteMovie)
app.use('/', moviesMylist)
app.use('/', watchedMovies)
app.use('/', getMovies)
app.use('/', posterDownload)

app.use('/', addShows)
app.use('/', updateShows)
app.use('/', watchedShows)
app.use('/', getShows)
app.use('/', showsMylist)
app.use('/', deleteShows)
app.use('/', checkcon)


// Handle database connection errors
db.on('error', console.error.bind(console, 'SQLite connection error:'));
db.once('open', () => {
    console.log('Connected to SQLite');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
