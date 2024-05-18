const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database
const db = new sqlite3.Database('pntflix.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        _id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        isAdmin INTEGER DEFAULT 0
    )`);

    // Create the movies table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS movies (
        _id INTEGER PRIMARY KEY,
        movieID INTEGER,
        backdropPath TEXT,
        budget INTEGER,
        genres TEXT,        
        genreIds TEXT,      
        originalTitle TEXT,
        overview TEXT,
        popularity REAL,
        posterPath TEXT,
        productionCompanies TEXT,
        releaseDate DATE,
        revenue INTEGER,
        runtime INTEGER,
        status TEXT,
        title TEXT,
        watchProviders TEXT,
        logos TEXT,
        downloadLink TEXT,
        ratings REAL
    )`);

    // User mylist for movies
    db.run(`CREATE TABLE IF NOT EXISTS user_movies_mylist (
        _id INTEGER PRIMARY KEY,
        user_id INTEGER,
        movie_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (movie_id) REFERENCES movies(id)
    )`);

    // User watched movies list
    db.run(`CREATE TABLE IF NOT EXISTS user_watchedmovie_list (
        _id INTEGER PRIMARY KEY,
        user_id INTEGER,
        movie_id INTEGER,
        watchedTime INTEGER DEFAULT 0,
        uploadTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (movie_id) REFERENCES movies(id)
    )`);

    // Create the TV shows table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS tv_shows (
        _id INTEGER PRIMARY KEY,
        name TEXT,
        overview TEXT,
        genres TEXT,
        posterPath TEXT,
        releaseDate DATE,
        ratings REAL
    )`);

    // Create the seasons table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS seasons (
        _id INTEGER PRIMARY KEY,
        show_id INTEGER,
        season_number INTEGER,
        FOREIGN KEY (show_id) REFERENCES tv_shows(_id)
    )`);

    // Create the episodes table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS episodes (
        _id INTEGER PRIMARY KEY,
        season_id INTEGER,
        episode_number INTEGER,
        name TEXT,
        runtime INTEGER,
        overview TEXT,
        poster TEXT,
        downloadLink TEXT,
        FOREIGN KEY (season_id) REFERENCES seasons(_id)
    )`);

    // Create the watchedShows table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS watched_shows (
        _id INTEGER PRIMARY KEY,
        user_id INTEGER,
        episode_id INTEGER,
        show_id INTEGER,
        watchedTime INTEGER DEFAULT 0,
        uploadTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(_id),
        FOREIGN KEY (episode_id) REFERENCES episodes(_id),
        FOREIGN KEY (show_id) REFERENCES tv_shows(_id)
    )`);

    // Create the user_shows_mylist table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS user_shows_mylist (
        _id INTEGER PRIMARY KEY,
        user_id INTEGER,
        show_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(_id),
        FOREIGN KEY (show_id) REFERENCES tv_shows(_id)
    )`);
});

module.exports = db;
