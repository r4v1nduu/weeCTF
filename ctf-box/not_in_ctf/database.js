const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a new SQLite3 database instance
const db = new sqlite3.Database(path.join(__dirname, 'blog.db'));

// Function to create the necessary tables
function createTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        admin BOOLEAN DEFAULT FALSE,
        flag VARCHAR(255),
        flag_seen_login BOOLEAN DEFAULT FALSE,
        flag_seen_delete BOOLEAN DEFAULT FALSE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        image_url VARCHAR(255),
        FOREIGN KEY (user_name) REFERENCES users(username)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        user_name VARCHAR(255),
        post_id INTEGER,
        FOREIGN KEY (user_name) REFERENCES users(username),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )
    `);

    db.run(`
      INSERT INTO users (username, password, flag, flag_seen_login)
      VALUES ('newuser35', 'ijQnTOzw', NULL, TRUE),
             ('newuser47', 'T6IGn3cm', 'ORL{s0kQc9cgHezyOY9b}', FALSE),
             ('olduser52', 'zCLyXGkk', NULL, TRUE);
    `);
  });
}

// Create the necessary tables
createTables();

// Close the database connection
db.close();